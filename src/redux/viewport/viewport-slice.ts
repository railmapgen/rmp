import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootDispatch, RootState } from '..';
import {
    applyRedoAction,
    applyUndoAction,
    replaceProjectState,
    setSvgViewport,
    setSvgViewBoxMin,
    setSvgViewBoxZoom,
} from '../param/param-slice';

export interface LiveViewport {
    x: number;
    y: number;
    zoom: number;
}

/** Holds an in-progress viewport preview before it is persisted in the project snapshot. */
export interface ViewportState {
    liveViewport?: LiveViewport;
}

const initialState: ViewportState = {
    liveViewport: undefined,
};

export const commitLiveViewport = (viewport?: LiveViewport) => (dispatch: RootDispatch, getState: () => RootState) => {
    const state = getState();
    const nextViewport = viewport ?? state.viewport.liveViewport;

    if (!nextViewport) return;

    const persistedMin = state.param.present.svgViewBoxMin;
    const persistedZoom = state.param.present.svgViewBoxZoom;
    const shouldUpdateZoom = persistedZoom !== nextViewport.zoom;
    const shouldUpdateMin = persistedMin.x !== nextViewport.x || persistedMin.y !== nextViewport.y;

    if (!shouldUpdateZoom && !shouldUpdateMin) {
        dispatch(clearLiveViewport());
        return;
    }

    dispatch(
        setSvgViewport({
            zoom: nextViewport.zoom,
            min: { x: nextViewport.x, y: nextViewport.y },
        })
    );
};

const viewportSlice = createSlice({
    name: 'viewport',
    initialState,
    reducers: {
        setLiveViewport: (state, action: PayloadAction<LiveViewport>) => {
            const nextViewport = action.payload;
            const currentViewport = state.liveViewport;

            if (
                currentViewport &&
                currentViewport.x === nextViewport.x &&
                currentViewport.y === nextViewport.y &&
                currentViewport.zoom === nextViewport.zoom
            ) {
                return;
            }

            state.liveViewport = nextViewport;
        },
        clearLiveViewport: state => {
            state.liveViewport = undefined;
        },
    },
    extraReducers: builder => {
        // Persisted viewport changes discard their transient preview. Graph-scoped
        // history deliberately keeps it so undo/redo cannot move the current view;
        // project-scoped history clears it to expose the restored project viewport.
        builder
            .addCase(setSvgViewport, state => {
                state.liveViewport = undefined;
            })
            .addCase(setSvgViewBoxZoom, state => {
                state.liveViewport = undefined;
            })
            .addCase(setSvgViewBoxMin, state => {
                state.liveViewport = undefined;
            })
            .addCase(replaceProjectState, state => {
                state.liveViewport = undefined;
            })
            .addCase(applyUndoAction, (state, action) => {
                if (action.payload === 'project') state.liveViewport = undefined;
            })
            .addCase(applyRedoAction, (state, action) => {
                if (action.payload === 'project') state.liveViewport = undefined;
            });
    },
});

export const { setLiveViewport, clearLiveViewport } = viewportSlice.actions;
export default viewportSlice.reducer;
