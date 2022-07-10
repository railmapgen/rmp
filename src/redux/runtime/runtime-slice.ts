import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ActiveType, RuntimeMode } from '../../constants/constants';

interface RuntimeState {
    selected: string[];
    active: ActiveType | undefined;
    refresh: {};
    mode: RuntimeMode;
}

const initialState: RuntimeState = {
    selected: [],
    active: undefined,
    refresh: {},
    mode: 'free',
};

const runtimeSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        addSelected: (state, action: PayloadAction<string>) => {
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
            state.refresh = {};
        },
        setMode: (state, action: PayloadAction<RuntimeMode>) => {
            state.mode = action.payload;
        },
    },
});

export const { addSelected, removeSelected, clearSelected, setActive, setRefresh, setMode } = runtimeSlice.actions;
export default runtimeSlice.reducer;
