import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ViewportState {
    gridViewport?: {
        x: number;
        y: number;
        zoom: number;
    };
}

const initialState: ViewportState = {
    gridViewport: undefined,
};

const viewportSlice = createSlice({
    name: 'viewport',
    initialState,
    reducers: {
        setGridViewport: (state, action: PayloadAction<NonNullable<ViewportState['gridViewport']>>) => {
            const nextViewport = action.payload;
            const currentViewport = state.gridViewport;

            if (
                currentViewport &&
                currentViewport.x === nextViewport.x &&
                currentViewport.y === nextViewport.y &&
                currentViewport.zoom === nextViewport.zoom
            ) {
                return;
            }

            state.gridViewport = nextViewport;
        },
        clearGridViewport: state => {
            state.gridViewport = undefined;
        },
    },
});

export const { setGridViewport, clearGridViewport } = viewportSlice.actions;
export default viewportSlice.reducer;
