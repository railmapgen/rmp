# Unified Graph Mutation Pipeline Design

> Status: proposal only. This document does not change the current implementation.
>
> The working API names are illustrative and may change during implementation.

## Background

Most graph edits currently follow some variation of this pattern inside a component:

```ts
window.graph.mergeNodeAttributes(id, attrs);
dispatch(saveGraph(window.graph.export()));
dispatch(refreshNodesThunk());
dispatch(refreshEdgesThunk());
```

The same sequence is repeated as `hardRefresh()` or `refreshAndSave()` throughout
the editor. It has several problems:

- callers must know whether nodes, edges, or both need refreshing;
- callers can save before path-owned attributes have been normalized;
- one logical user action can accidentally produce multiple undo snapshots;
- node and edge count, font, subscription-limit, and station-type checks are easy
  to omit;
- rendering invalidation, derived runtime reconciliation, undo history, and local
  persistence are coupled;
- graph existence checks and stale selections are handled inconsistently;
- interactive overlays need a different preview/commit lifecycle from ordinary
  form edits;
- whole-graph loading and clipboard import must preserve saved attributes instead
  of treating every imported edge as a newly authored edge.

The temporary `commitEdgesThunk` solves the ordering problem for the Bezier
endpoint invariant, but it does not solve the broader duplication. Extending it
alongside `refreshNodesThunk` and `refreshEdgesThunk` would leave three overlapping
entry points.

## Goal

Provide one public graph-operation thunk that owns the complete lifecycle of a
logical graph edit:

```text
validate targets
    → apply graph operations
    → normalize path-owned edge attributes when applicable
    → run graph-derived business rules
    → save one undo snapshot when applicable
    → reconcile runtime-derived state
    → invalidate the required canvas layers
```

Components should describe which node or edge is being operated on and what the
operation does. They should not manually compose `saveGraph()`,
`refreshNodesThunk()`, and `refreshEdgesThunk()`.

## Decision summary

- Expose one public handwritten thunk, provisionally
  `applyGraphOperations()`.
- Accept a validated list of node and edge operations rather than asking
  components which refresh thunks to call.
- Support commit, preview, whole-graph replacement, and pure refresh requests.
- Normalize surviving changed edges through a dependency-light registered
  LinePath hook.
- Run graph-mutating business rules before one `saveGraph()` dispatch.
- Move the existing node/edge count, font, and limit checks into private runtime
  reconciliation helpers.
- Infer conservative render invalidation from the changed entity sets.
- Persist local storage from committed `param.present` changes, not render
  refresh timestamps.
- Remove the old public refresh thunks, temporary `commitEdgesThunk`, and
  component-local hard-refresh helpers after migration.

## Non-goals

The first implementation should not:

- move UI state such as selection, modal state, toasts, or telemetry into the
  graph-operation thunk;
- turn every domain utility into a Redux action;
- normalize projects while loading or copying existing saved data;
- infer arbitrary side effects from an opaque callback that mutates undeclared
  graph elements;
- change save-format or undo-history semantics;
- optimize every derived-state calculation before the unified behavior is
  correct and covered by tests.

## Terminology

This document uses **edge** for a graph edge ID such as `line_*`. A LinePath is
the edge's path implementation selected by its `type` attribute.

There are four separate concepts that the current hard-refresh pattern mixes:

1. **Mutation** changes `window.graph`.
2. **Normalization** lets an entity implementation maintain its own invariant.
3. **Persistence** writes one committed graph state to Redux undo history.
4. **Reconciliation and invalidation** update derived runtime state and cause
   React/SVG layers to render the graph again.

The unified entry point coordinates them, but their internal responsibilities
should remain separate.

## Proposed public API

Use a typed handwritten thunk rather than `createAsyncThunk`. Operation callbacks
are process-local behavior and should not be placed in Redux action payloads.

```ts
type GraphOperationMode = 'commit' | 'preview';

type NodeOperation =
    | {
          target: 'node';
          kind: 'create' | 'update' | 'delete';
          id: NodeId;
          run: (graph: RMPGraph, id: NodeId) => void | boolean;
      }
    | {
          target: 'node';
          kind: 'create';
          id: NodeId;
          attrs: NodeAttributes;
      };

type EdgeOperation =
    | {
          target: 'edge';
          kind: 'create' | 'update' | 'delete';
          id: LineId;
          run: (graph: RMPGraph, id: LineId) => void | boolean;
          normalization?: 'auto' | 'preserve';
          retainAsNormalizationAnchor?: boolean;
      }
    | {
          target: 'edge';
          kind: 'create';
          id: LineId;
          source: NodeId;
          targetNode: NodeId;
          attrs: EdgeAttributes;
          normalization?: 'auto' | 'preserve';
      };

interface MutateGraphRequest {
    kind: 'mutate';
    mode?: GraphOperationMode;
    operations: readonly (NodeOperation | EdgeOperation)[];
    /**
     * Used when a preview has already changed window.graph and pointer-up only
     * needs to commit its current state.
     */
    commitCurrentGraph?: boolean;
}

interface ReplaceGraphRequest {
    kind: 'replace';
    graph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    history: 'commit' | 'reset';
}

interface RefreshGraphRequest {
    kind: 'refresh';
}

type GraphOperationRequest = MutateGraphRequest | ReplaceGraphRequest | RefreshGraphRequest;

export const applyGraphOperations =
    (request: GraphOperationRequest): AppThunk<Promise<GraphOperationResult>> =>
    async (dispatch, getState) => {
        // implementation
    };
```

The common operations should have small typed factories so components do not
construct descriptors manually:

```ts
dispatch(
    applyGraphOperations({
        kind: 'mutate',
        operations: [
            updateNode(nodeId, (graph, id) => {
                graph.mergeNodeAttributes(id, { x, y });
            }),
        ],
    })
);
```

Useful initial factories include:

- `createNode()`
- `updateNode()`
- `deleteNode()`
- `createEdge()`
- `updateEdge()`
- `deleteEdge()`

Common attribute merges should use declarative overloads where practical.
Complex existing utilities may use a callback during migration, but a callback
must only mutate its declared target. A transaction-wide escape hatch must
return the complete set of touched node and edge IDs.

## Request modes

### Commit

`kind: 'mutate', mode: 'commit'` is the default for ordinary editor actions.

If at least one valid operation changes the graph, the thunk normalizes, runs
business rules, dispatches `saveGraph()` exactly once, reconciles runtime state,
and invalidates the required layers.

If every target is missing or every callback returns `false`, it does not create
an undo entry.

### Preview

`mode: 'preview'` is for pointer-move interactions:

- apply the operation;
- normalize when the preview depends on normalized geometry;
- invalidate rendering;
- do not dispatch `saveGraph()`;
- defer graph-mutating business rules until the final commit.

Pointer-up either repeats the final update as a committed operation or uses
`commitCurrentGraph: true`. This produces one undo entry for the entire drag
instead of one entry per pointer event.

### Replace

`kind: 'replace'` is for opening, importing, clearing, or resetting a whole
graph. It is exclusive and cannot be mixed with per-entity operations.

Replacement preserves the supplied graph exactly:

- no LinePath normalization;
- no automatic station mutation;
- full node and edge derived-state reconciliation;
- full layer invalidation;
- history behavior selected explicitly as `commit` or `reset`.

### Refresh

`kind: 'refresh'` performs no graph mutation and no save. It recomputes all
derived runtime state and invalidates both graph layers.

This replaces initialization/manual-refresh uses of the two existing refresh
thunks. Undo and redo should also schedule this request after `window.graph` has
been restored.

## Validation and change detection

The executor validates the complete request before applying it:

- node create requires that the ID does not exist;
- node update/delete requires that the ID exists;
- edge create requires that the edge ID does not exist and that both endpoints
  will exist after node-creation operations;
- edge update/delete requires that the edge ID exists;
- one request may contain at most one operation per entity ID;
- graph replacement cannot be combined with entity operations;
- an edge may not be created against a node scheduled for deletion.

A stale update/delete target is skipped and reported in the result. A structurally
invalid plan, such as duplicate operations or a missing new-edge endpoint, aborts
before mutation.

For update callbacks:

- returning `false` explicitly reports a no-op;
- returning `true` or `void` reports a change after the callback runs.

The initial implementation should not deep-compare every graph attribute. That
would serialize large graphs twice and still would not describe semantic impact.
Typed operation factories are the source of mutation intent.

In development and tests, short-lived Graphology event listeners may assert that
a callback did not mutate undeclared IDs.

The result should make skipped work observable:

```ts
interface GraphOperationResult {
    changedNodeIds: NodeId[];
    changedEdgeIds: LineId[];
    createdEdgeIds: LineId[];
    deletedEdgeIds: LineId[];
    normalizedEdgeIds: LineId[];
    skipped: { target: 'node' | 'edge'; id: string; reason: string }[];
    saved: boolean;
}
```

## Execution phases

Entity operations are a transaction plan, not an arbitrary imperative sequence.
The executor uses stable phases:

1. Validate the full request.
2. Capture the endpoints of edges that may be removed.
3. Apply node creates.
4. Apply node updates.
5. Apply edge creates and updates.
6. Apply ordinary edge deletes and node deletes.
7. Normalize all surviving changed edges as one ordered batch.
8. Drop edges retained temporarily as normalization anchors.
9. Run post-mutation graph business rules.
10. Save the resulting graph once for commit mode.
11. Reconcile runtime-derived state.
12. Invalidate affected render layers.

The batch preserves request order but treats all not-yet-normalized changed edges
as unavailable anchors. This prevents one partially changed edge from supplying
stale endpoint attributes to another edge in the same transaction.

### Replacement anchors

Most deleted edges must not influence the final normalized graph and are removed
before normalization.

Edge replacement is the exception. When an operation creates replacement edges
whose new attributes must inherit an endpoint invariant from an old edge, the
delete operation sets `retainAsNormalizationAnchor: true`. The executor keeps
that edge until its replacements have been normalized, then deletes it before
business rules and persistence.

Bezier line splitting is the initial use case:

```ts
operations: [
    createNode(insertedNode),
    createEdge(firstHalf, { normalization: 'auto' }),
    createEdge(secondHalf, { normalization: 'auto' }),
    deleteEdge(original, { retainAsNormalizationAnchor: true }),
];
```

This is a generic replacement relationship rather than a Bezier special case in
the canvas or in `change-types.ts`.

## LinePath normalization registry

The unified thunk must not import the complete React LinePath registry. Doing so
would create a dependency cycle:

```text
Redux graph thunk → linePaths → line/overlay components → Redux graph thunk
```

Introduce a dependency-light normalizer registry:

```ts
registerLinePathNormalizer(type, normalizer);
normalizeEdgeAttributes(graph, edgeChanges);
```

When `linePaths` is assembled, it registers every optional
`LinePath.normalizeEdgeAttrs` implementation. The graph thunk only imports the
dependency-light registry.

The normalizer input should support a mode per edge rather than one mode for the
whole batch:

```ts
interface EdgeNormalizationRequest {
    id: LineId;
    mode: 'created' | 'updated';
}
```

The executor derives the mode from pre-operation existence:

- absent before and present after: `created`;
- present before and present after: `updated`;
- deleted after: no normalization.

`normalization: 'preserve'` skips registration lookup. Use it for:

- copying/pasting existing serialized elements;
- importing existing edge data;
- whole-graph replacement.

Ordinary new line creation and edge updates use `auto`.

Hidden edges remain eligible peers. Visibility is not part of normalization
eligibility.

## Business-rule pipeline

There are two categories of post-operation work.

### Graph-mutating domain rules

These run before `saveGraph()` because their result belongs in the same undo
entry as the initiating operation.

The first rule to centralize is automatic station type and transfer maintenance.
Its candidate stations are derived from the pre- and post-operation endpoints of
changed or deleted edges. It runs only when the corresponding preference is
enabled.

The rule must return any additional changed node IDs so reconciliation and
render invalidation include them.

Preview, refresh, and graph replacement do not run graph-mutating domain rules.
They must not silently rewrite project data.

Operation-specific calculations remain outside this pipeline, including:

- choosing a new node or edge ID;
- calculating a parallel index before edge creation;
- applying subscription-based import clamps;
- choosing a new station or line type;
- telemetry, selection, notifications, and clipboard errors.

These calculations form the operation supplied to the thunk; they are not
post-commit invariants.

### Runtime-derived reconciliation

The existing logic in `refreshNodesThunk` and `refreshEdgesThunk` moves into
private reconciliation helpers used by the unified thunk.

Node reconciliation currently owns:

- station, misc-node, and master counts;
- most-frequent station type;
- existing node-type collection;
- required font loading;
- master subscription-limit alerts.

Edge reconciliation currently owns:

- line and parallel-line counts;
- disabling auto-parallel at the configured limit;
- parallel-line subscription-limit alerts.

For the first implementation, correctness is preferable to fine-grained
optimization:

- any node mutation runs node reconciliation;
- any edge mutation runs edge reconciliation;
- node deletion also runs edge reconciliation because incident edges can be
  removed by Graphology;
- whole-graph replacement and explicit refresh run both.

This can later be narrowed using operation kinds after measurements demonstrate
a need.

## Render invalidation

Runtime-derived reconciliation and rendering invalidation should be separate
helpers even if the first implementation invokes them together.

Initial conservative rules:

| Change                    | Node layer                                    | Edge layer |
| ------------------------- | --------------------------------------------- | ---------- |
| Node create/update/delete | refresh                                       | refresh    |
| Edge create/update/delete | unchanged unless a domain rule changes a node | refresh    |
| Whole graph replace       | refresh                                       | refresh    |
| Explicit refresh          | refresh                                       | refresh    |

Refreshing edges for every node update is intentionally conservative. Node
coordinates affect edge geometry, and avoiding another caller-supplied
`affectsEdges` flag is more valuable than a premature micro-optimization.

## Persistence and local storage

`saveGraph()` and render refresh timestamps must stop being interchangeable
signals.

The current local-storage listener watches:

```text
runtime.refresh.nodes or runtime.refresh.edges
```

This means a redraw can cause persistence work even when no committed graph
state changed. The listener should instead react to the committed param state,
preferably the `saveGraph` action or a change in `param.present`.

Consequences:

- preview updates can redraw without writing local storage;
- explicit refresh does not imply persistence;
- one committed transaction produces one undo entry and one persistence signal;
- `useGraphEvents` must not independently dispatch `saveGraph()` because it would
  bypass transaction boundaries. The currently unused hook should be removed or
  repurposed as a development assertion.

## Error handling

Mutation callbacks are synchronous. Async preparation such as clipboard reads,
file parsing, or network work finishes before dispatching the transaction.
This prevents two awaited callbacks from interleaving writes to `window.graph`.

Before applying a valid mutation plan, the executor captures a rollback export.
If an operation, normalizer, or graph-mutating domain rule throws:

1. clear and restore `window.graph` from the rollback export;
2. do not dispatch `saveGraph()`;
3. run full derived-state reconciliation and invalidation;
4. reject or return a failed result for the caller to display.

Rollback is internal recovery, not a new undo entry.

## Representative migrations

### Node position edit

Before:

```ts
graph.mergeNodeAttributes(id, { x });
saveGraph();
refreshNodes();
refreshEdges();
```

After:

```ts
dispatch(
    applyGraphOperations({
        kind: 'mutate',
        operations: [updateNode(id, graph => graph.mergeNodeAttributes(id, { x }))],
    })
);
```

### Line style attribute edit

```ts
dispatch(
    applyGraphOperations({
        kind: 'mutate',
        operations: [
            updateEdge(id, graph => {
                graph.mergeEdgeAttributes(id, { [style]: attrs });
            }),
        ],
    })
);
```

The executor recognizes an updated surviving edge, invokes its registered
normalizer, saves the normalized graph, reconciles edge runtime state, and
invalidates the edge layer.

### Clipboard element paste

Pasted serialized edges are created with `normalization: 'preserve'`. The
transaction still saves once and reconciles both node and edge state.

### Overlay drag

Pointer move dispatches preview operations. Pointer up commits the final
operation or the current preview graph. Only pointer up writes undo history.

### Initialization, undo, and redo

After the graph has been loaded or restored:

```ts
dispatch(applyGraphOperations({ kind: 'refresh' }));
```

No normalization or save occurs.

## Dependency layout

A possible file layout is:

```text
src/
  redux/
    graph/
      graph-operations.ts
      graph-operation-thunk.ts
      runtime-reconciliation.ts
  util/
    line-path-normalizer-registry.ts
```

`runtime-slice.ts` retains runtime state and reducer actions, but no longer
exports public graph-refresh thunks. `param-slice.ts` retains undo state and the
`saveGraph` reducer.

The dependency direction is:

```text
components
    → graph-operation thunk
        → dependency-light normalizer registry
        → param/runtime reducer actions
        → pure graph/domain utilities

linePaths
    → register optional normalizers
```

The graph-operation thunk must not import React components or the complete
`linePaths`/`lineStyles` object.

## Migration plan

Implement incrementally while keeping behavior testable:

1. Add the dependency-light LinePath normalizer registry and tests.
2. Add operation types, factories, and the unified thunk with no production
   callers.
3. Extract node/edge derived-state reconciliation from the existing refresh
   thunks.
4. Migrate edge creation, edge attributes, type/style changes, and the temporary
   `commitEdgesThunk`.
5. Migrate node detail fields and node movement.
6. Migrate deletion, clipboard, bulk transforms, and import/open flows.
7. Migrate overlays to preview/commit transactions.
8. Route initialization and undo/redo through explicit refresh requests.
9. Move local persistence from refresh timestamps to committed param changes.
10. Remove component-local `hardRefresh`/`refreshAndSave`, the old node/edge
    refresh thunks, `commitEdgesThunk`, and the unused graph-event saver.

During migration, old and new paths must not both save the same logical action.

## Decisions to confirm before implementation

The proposal currently makes the following product/architecture choices:

1. Missing update/delete targets are skipped and reported; an invalid transaction
   shape aborts before mutation.
2. Every ordinary surviving edge update is eligible for registered
   normalization. Imported/copied data must opt into `preserve`.
3. A node mutation conservatively redraws both nodes and edges.
4. Automatic station type/transfer maintenance becomes a transaction-level
   post-rule for affected edge endpoints.
5. Pointer movement is preview-only and pointer-up creates one undo entry.
6. Edge replacement may explicitly retain a deleted edge as a temporary
   normalization anchor; ordinary deleted edges are not anchors.
7. Whole-graph replacement and pure refresh never run graph-mutating business
   rules or normalization.

These should be agreed before production callers are migrated, because changing
them later would alter the operation API and transaction ordering.

## Test plan

### Operation executor

Cover:

- stale update/delete IDs being skipped without saving;
- invalid create plans aborting before mutation;
- create, update, and delete operations producing one save;
- a callback returning `false` producing no undo entry;
- rollback after an operation or normalizer throws;
- node deletion recording incident edge changes;
- graph replacement and explicit refresh preserving graph attributes;
- preview followed by commit producing one undo entry.

### Normalization

Cover:

- normalizer registration without importing React components;
- per-edge `created` and `updated` modes in one batch;
- later changed edges not acting as premature anchors;
- ordinary deleted edges being unavailable as anchors;
- retained replacement edges remaining anchors until normalization completes;
- copied/imported edges using `preserve`;
- hidden same-style peers remaining eligible.

### Business rules and derived runtime state

Cover:

- affected station endpoints being collected before edge deletion;
- automatic station maintenance running once per station per transaction;
- preview/replace/refresh not mutating stations;
- node and edge counts after create/delete and node cascade deletion;
- font/type reconciliation after node type changes;
- subscription alerts and auto-parallel behavior;
- node changes invalidating both layers and edge-only changes invalidating the
  edge layer.

### Integration

Add focused tests for:

- normal line creation;
- Bezier creation and splitting;
- style/color changes that merge same-style endpoint groups;
- node dragging with one undo entry;
- edge and node deletion;
- clipboard paste preserving serialized offsets;
- whole-project open/import;
- undo and redo followed by correct counts and rendering.

Finally run the repository gates:

```bash
npm run lint
npm test -- --run
npm run build
git diff --check
```
