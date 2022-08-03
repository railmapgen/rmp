import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ActiveType, RuntimeMode, Theme } from '../../constants/constants';

interface RuntimeState {
    selected: string[];
    active: ActiveType | undefined;
    refresh: {
        all: {};
        reconcileLine: {};
    };
    mode: RuntimeMode;
    /**
     * Controls the zoom of the svg.
     * NOTE IT IS SUPER IMPORTANT TO TAKE THIS FACTOR INTO CONSIDERATION
     * IF YOU WANT TO USE THE CORRECT MOUSE POSITION!
     */
    svgViewBoxZoom: number;
    theme: Theme;
}

const initialState: RuntimeState = {
    selected: [],
    active: undefined,
    refresh: {
        all: {},
        reconcileLine: {},
    },
    mode: 'free',
    svgViewBoxZoom: 100,
    theme: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
};

const runtimeSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        addSelected: (state, action: PayloadAction<string>) => {
            if (!state.selected.includes(action.payload))
                // only push if it is not already in selected
                state.selected.push(action.payload);
        },
        removeSelected: (state, action: PayloadAction<string>) => {
            state.selected.filter(_ => _ !== action.payload);
        },
        clearSelected: state => {
            state.selected = [];
        },
        setActive: (state, action: PayloadAction<ActiveType | undefined>) => {
            state.active = action.payload;
        },
        setRefresh: state => {
            state.refresh.all = {};
        },
        setRefreshReconcile: state => {
            state.refresh.reconcileLine = {};
        },
        setMode: (state, action: PayloadAction<RuntimeMode>) => {
            state.mode = action.payload;
        },
        setSvgViewBoxZoom: (state, action: PayloadAction<number>) => {
            state.svgViewBoxZoom = action.payload;
        },
        setTheme: (state, action: PayloadAction<Theme>) => {
            state.theme = action.payload;
        },
    },
});

export const {
    addSelected,
    removeSelected,
    clearSelected,
    setActive,
    setRefresh,
    setRefreshReconcile,
    setMode,
    setSvgViewBoxZoom,
    setTheme,
} = runtimeSlice.actions;
export default runtimeSlice.reducer;
