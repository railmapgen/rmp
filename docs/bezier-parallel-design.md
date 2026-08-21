# Bezier Parallel Line Design

> Status: design note only. Bezier parallel rendering is intentionally not enabled yet.
>
> Intended implementation order: `#1525-bezier-line-path` → `#1505-real-map` →
> `#1528-on-demand-map-rendering`.

## Background

Bezier paths are currently available to free users while the map is shown, but
`supportsParallelLinePath(LinePathType.Bezier)` deliberately returns `false`.
This is not a limitation of the map canvas. Parallel paths are resolved from the
graph before line styles render, so the same mechanism can be used with the map
shown or hidden.

Most of the geometry support already exists:

* Bezier generates a cubic `OpenPath`.
* `makeOpenPathParallel()` can offset cubic commands through `bezier-js`.
* Line styles consume the resolved path and therefore do not need Bezier-specific
  parallel handling.

The missing work is mainly in the parallel grouping contract. The current
implementation assumes every supported path has `startFrom` and
`roundCornerFactor`, while Bezier uses `along`, `normal`, and optional source
and target XY offsets. Merely removing Bezier from the exclusion list would
therefore be unsafe and would still render straight fallback paths.

## Goal

Allow multiple Bezier edges with the same directed endpoints to form a parallel
group:

* The lowest `parallelIndex` supplies the authored Bezier geometry, matching the
  existing parallel-line model.
* Index `0` uses that geometry unchanged.
* Higher indices are offset by `parallelIndex * 5` graph units.
* Positive indices are placed on the outside of the Bezier bend.
* The resolved `OpenPath` continues through the normal line-style pipeline.

This should work for every line style already compatible with Bezier. The map
renderer, tile controller, save format, and line styles should not require
special cases.

## Non-goals

This change should not:

* add parallel support to Freeform, Simple, or Ray Guided paths;
* group Bezier edges whose source and target are reversed;
* let every member of a parallel group define a different Bezier shape;
* introduce a new saved attribute or save-version migration;
* attempt to represent an exact equidistant curve as one cubic segment.

`bezier-js` produces the practical offset approximation already used by the
repository. Changing that approximation should be a separate geometry task.

## Recommended semantics

### Grouping

Only Bezier edges with the same `source → target` direction belong to one group.
Keeping direction significant avoids silently changing the meaning of the saved
attributes:

* reversing a Bezier changes `along` to `1 - along`;
* reversing it also changes the sign of `normal`;
* path direction can matter to styles and decorations.

Existing `startFrom`-based path types should retain their current behavior,
where a reversed edge with the opposite `startFrom` can share a group.

This difference should be represented by a grouping helper or discriminated
type, not by inventing a meaningless `startFrom` value for Bezier.

### Base geometry

Parallel members should continue to share the geometry of the member with the
lowest index. Attributes saved on subordinate members remain preserved but do
not affect rendering while those members are subordinate. This matches the
existing parallel implementation and allows a line to recover its own shape if
parallel mode is later disabled.

The Bezier `along`, `normal`, and endpoint-offset fields, as well as its drag
overlays, should be disabled for subordinate members. Editing them would
otherwise appear to do nothing because rendering uses the base member's
attributes.

### Offset side

`makeOpenPathParallel()` returns both signed offsets. Bezier should choose the
one that moves away from the chord on the same side as its bend, using the sign
of the base path's `normal` attribute.

This decision belongs in the parallel geometry layer. It should not be encoded
inside a line style because all styles must receive the same resolved path.
When `normal` is zero, use a stable default side; the curve has no meaningful
inside/outside distinction in that case.

## Implementation outline

### 1. Separate support from legacy attributes

Refactor `src/util/parallel.ts` so “supports parallel rendering” no longer means
“has `startFrom` and `roundCornerFactor`”.

A useful shape is:

```ts
type StartFromParallelLinePathType = /* current supported types */;
type ParallelLinePathType = StartFromParallelLinePathType | LinePathType.Bezier;
```

Centralize group comparison in a helper that understands both contracts:

```ts
type ParallelGroupIdentity =
    | { type: StartFromParallelLinePathType; orientedSource: NodeId; orientedTarget: NodeId }
    | { type: LinePathType.Bezier; source: NodeId; target: NodeId };
```

The exact API can differ, but callers should no longer cast all path attributes
to `ParallelLinePathAttributes`. A central identity also prevents grouping rules
from drifting between classification, index allocation, and base-line lookup.

Update all callers that currently pass or read `startFrom`:

* `src/util/parallel.ts`
* `src/components/svg-canvas-graph.tsx`
* `src/components/panels/details/info-section.tsx`
* `src/components/panels/details/specific-attrs.tsx`
* `src/util/change-types.ts`
* `src/util/clipboard.ts`
* `src/util/rmg-param-parser.ts`

For a new Bezier edge, group identity comes directly from its directed source
and target. Existing path types continue to use `startFrom`.

### 2. Generate the Bezier base without legacy rounding attributes

`makeParallelPaths()` currently reads `roundCornerFactor` unconditionally and
forces a minimum value before generating the base path. That behavior is needed
by corner-based paths, not by Bezier.

Split base-path generation by capability:

* retain the minimum round-corner behavior for existing path types;
* pass Bezier's saved `along`, `normal`, and endpoint offsets directly to its generator.

The result should still be checked with `isOpenPath()` before offsetting. This
keeps the parallel resolver safe if another path type later produces an area
path.

### 3. Send cubic Bezier paths through the existing offset utility

The current code only calls `makeOpenPathParallel()` for `isShortOpenPath()`.
Bezier produces a `CubicPath` (`kind: "mc"`), so it misses that branch and falls
back to two straight lines.

The minimal change is to use the offset utility when the base type is Bezier as
well as when the path is a short open path:

```ts
const canOffset = type === LinePathType.Bezier || isShortOpenPath(basePath);
```

Do not broaden the behavior for every complex open path as part of this feature;
that could change existing path types without a related product requirement.

### 4. Make degenerate offsets safe

A valid saved Bezier can become geometrically degenerate. In particular, when
its tangent-intersection control coincides with an endpoint,
`Bezier.scale(distance)` can return non-finite points.

Validate every generated offset point before it enters SVG path serialization.
If offset generation throws or produces a non-finite result, use the existing
straight parallel fallback between the two endpoints. A visible straight
fallback is preferable to an invalid `d` attribute that can make the entire
line disappear or propagate `NaN` through later processing.

Keep this recovery close to `makeOpenPathParallel()`/`makeParallelPaths()` so
all callers receive a valid `OpenPath`.

### 5. Respect base ownership in the editor

Follow the existing parallel path UI pattern in
`src/components/svgs/lines/paths/`:

* use `getBaseParallelLineID()` to identify the geometry owner;
* disable Bezier's geometry inputs on subordinate members;
* show the existing message and action that selects the base line;
* do not show an editable Bezier control handle for a subordinate member.

The last point is important: a subordinate line's stored control point is not
the path being rendered, so exposing that handle would edit invisible geometry.

### 6. Keep tangent snapping consistent with rendered geometry

`src/components/svgs/lines/paths/bezier-snap.ts` currently derives candidates
from every connected Bezier edge's saved attributes. Once parallel rendering is
enabled, subordinate attributes no longer describe their visible paths.

Exclude subordinate parallel members from tangent candidates. The authored base
Bezier remains the single source of tangent geometry for the group. This avoids
snapping to an invisible, stale control point.

No special map-coordinate conversion is needed. Snapping and parallel offsets
both operate in graph coordinates before the map viewport transform.

## Expected processing flow

```text
graph Bezier edges
    → build type-aware parallel group identity
    → choose lowest-index geometry owner
    → generate one cubic OpenPath from along/normal and endpoint offsets
    → offset it for each positive parallelIndex
    → validate or use straight fallback
    → pass each resolved OpenPath to its existing line style
```

## Compatibility

No save migration is expected:

* every edge already has `parallelIndex`;
* Bezier already saves `along` and `normal`, while missing endpoint offsets default to zero;
* old projects keep Bezier at `parallelIndex: -1`;
* subscription limits count supported parallel lines generically and can include
  Bezier after `supportsParallelLinePath()` is enabled.

Bezier remains contextually restricted through the centralized line-access
policy. Parallel support itself should not check map visibility.

## Test plan

Add coverage at the geometry, grouping, and integration boundaries.

### Geometry

Extend `src/util/bezier-parallel.test.ts` with:

* a single cubic Bezier offset on both sides;
* an asymmetric Bezier to verify side selection;
* a collinear control point;
* a control point coincident with an endpoint, verifying that no output point is
  `NaN` or infinite;
* endpoint and command continuity assertions.

### Parallel grouping

Extend `src/util/parallel.test.ts` with:

* same-direction Bezier edges grouped and assigned consecutive indices;
* reversed Bezier edges kept in separate groups;
* Bezier not grouped with another path type;
* the lowest index supplying geometry;
* positive indices using cubic output rather than the straight fallback;
* degenerate cubic offset using a valid straight fallback;
* Ray Guided, Simple, and Freeform remaining unsupported.

### UI and path registration

Update `src/components/svgs/lines/paths/bezier.test.ts` to expect Bezier parallel
support. Add focused tests where practical for:

* subordinate attribute fields being disabled;
* subordinate overlays being hidden;
* tangent candidate collection ignoring subordinate members.

Finally run the repository completion checks:

```bash
npx tsc --noEmit
npm run lint
npm test
git diff --check
```

## Acceptance criteria

The implementation is complete when:

1. A map-enabled canvas can assign parallel indices to same-direction Bezier edges.
2. Index `0` follows the authored Bezier and higher indices visibly follow its
   curvature at the standard five-unit spacing.
3. Reversed edges do not unexpectedly join the group.
4. Any line style compatible with Bezier renders the resolved paths without
   Bezier-specific style code.
5. Subordinate geometry cannot be edited or used as a tangent snap candidate.
6. Degenerate controls never produce an invalid SVG path.
7. Existing parallel path types retain their grouping and rendering behavior.
