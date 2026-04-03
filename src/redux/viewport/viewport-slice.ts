import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootDispatch, RootState } from '..';
import { setSvgViewport, setSvgViewBoxMin, setSvgViewBoxZoom } from '../param/param-slice';

export interface LiveViewport {
    x: number;
    y: number;
    zoom: number;
}

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

    const persistedMin = state.param.svgViewBoxMin;
    const persistedZoom = state.param.svgViewBoxZoom;
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
        builder
            .addCase(setSvgViewport, state => {
                state.liveViewport = undefined;
            })
            .addCase(setSvgViewBoxZoom, state => {
                state.liveViewport = undefined;
            })
            .addCase(setSvgViewBoxMin, state => {
                state.liveViewport = undefined;
            });
    },
});

export const { setLiveViewport, clearLiveViewport } = viewportSlice.actions;
export default viewportSlice.reducer;
