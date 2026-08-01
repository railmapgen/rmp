import { createAsyncThunk } from '@reduxjs/toolkit';
import { normalizeEdgeAttributes } from '../../components/svgs/lines/lines';
import { LineId } from '../../constants/constants';
import { LinePathEdgeAttrsNormalizationMode } from '../../constants/lines';
import { refreshEdgesThunk } from '../runtime/runtime-slice';
import { saveGraph } from './param-slice';

interface CommitEdgesPayload {
    edgeIds: LineId[];
    mode?: LinePathEdgeAttrsNormalizationMode;
}

/**
 * Finalize semantic edge mutations in one place so path-owned invariants are applied before the undo snapshot.
 */
export const commitEdgesThunk = createAsyncThunk(
    'param/commitEdges',
    async ({ edgeIds, mode = 'updated' }: CommitEdgesPayload, { dispatch }) => {
        normalizeEdgeAttributes(window.graph, edgeIds, mode);
        dispatch(saveGraph(window.graph.export()));
        await dispatch(refreshEdgesThunk());
    }
);
