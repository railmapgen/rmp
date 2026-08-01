import { createAsyncThunk } from '@reduxjs/toolkit';
import { normalizeEdgeAttributes } from '../../components/svgs/lines/lines';
import { LineId } from '../../constants/constants';
import { LinePathEdgeAttrsNormalizationMode } from '../../constants/lines';
import { refreshEdgesThunk } from '../runtime/runtime-slice';
import { saveGraph } from './param-slice';

/**
 * Describes which edges in an already-mutated `window.graph` need normalization before the whole graph is saved.
 *
 * `edgeIds` is the normalization scope, not the persistence scope: unrelated node changes already made in the same
 * logical operation are included in the resulting graph snapshot, and a node-only operation may pass an empty list.
 * Callers must include every changed edge whose LinePath invariant may need repair.
 *
 * One mode applies to the entire list. Use `created` only when all listed edges are newly authored; existing-edge
 * edits use the default `updated` behavior. Imported/copied serialized edges must be omitted because their saved
 * attributes should be preserved.
 */
interface CommitEdgesPayload {
    edgeIds: LineId[];
    mode?: LinePathEdgeAttrsNormalizationMode;
}

/**
 * Finalizes a logical graph mutation that the caller has already applied to `window.graph`.
 *
 * Registered LinePath invariants for `edgeIds` are normalized first, then the entire resulting graph is saved as one
 * undo entry and edge runtime state is refreshed. It is a commit boundary, not a rendering helper: preview-only
 * refreshes and graph reads should continue to use the runtime refresh path without creating history. Callers that
 * changed nodes must still request the required node refresh after this thunk completes.
 */
export const commitEdgesThunk = createAsyncThunk(
    'param/commitEdges',
    async ({ edgeIds, mode = 'updated' }: CommitEdgesPayload, { dispatch }) => {
        normalizeEdgeAttributes(window.graph, edgeIds, mode);
        dispatch(saveGraph(window.graph.export()));
        await dispatch(refreshEdgesThunk()).unwrap();
    }
);
