import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
    counter: number;
    graph: string;
}

const initGraph =
    '{"counter":0,"graph":"{\\"options\\":{\\"type\\":\\"directed\\",\\"multi\\":true,\\"allowSelfLoops\\":true},\\"attributes\\":{},\\"nodes\\":[{\\"key\\":\\"stn_1\\",\\"attributes\\":{\\"x\\":250,\\"y\\":150,\\"names\\":[\\"车站1\\",\\"Stn 1\\"]}},{\\"key\\":\\"stn_2\\",\\"attributes\\":{\\"x\\":250,\\"y\\":250,\\"names\\":[\\"车站2\\",\\"Stn 2\\"]}},{\\"key\\":\\"stn_3\\",\\"attributes\\":{\\"x\\":250,\\"y\\":350,\\"names\\":[\\"车站3\\",\\"Stn 3\\"]}},{\\"key\\":\\"stn_4\\",\\"attributes\\":{\\"x\\":90.48284912109375,\\"y\\":320.5001220703125,\\"names\\":[\\"车站4\\",\\"Stn 4\\"]}},{\\"key\\":\\"stn_5\\",\\"attributes\\":{\\"x\\":395.21673583984375,\\"y\\":184.30001831054688,\\"names\\":[\\"车站5\\",\\"Stn 5\\"]}}],\\"edges\\":[{\\"key\\":\\"line_1_1\\",\\"source\\":\\"stn_1\\",\\"target\\":\\"stn_2\\",\\"attributes\\":{\\"color\\":[\\"shanghai\\",\\"sh1\\",\\"#E4002B\\",\\"#fff\\"],\\"type\\":\\"diagonal\\",\\"diagonal\\":{\\"startFrom\\":\\"from\\",\\"offsetFrom\\":0,\\"offsetTo\\":0}}},{\\"key\\":\\"line_1_2\\",\\"source\\":\\"stn_2\\",\\"target\\":\\"stn_3\\",\\"attributes\\":{\\"color\\":[\\"shanghai\\",\\"sh1\\",\\"#E4002B\\",\\"#fff\\"],\\"type\\":\\"diagonal\\",\\"diagonal\\":{\\"startFrom\\":\\"from\\",\\"offsetFrom\\":0,\\"offsetTo\\":0}}},{\\"key\\":\\"line_2_1\\",\\"source\\":\\"stn_4\\",\\"target\\":\\"stn_2\\",\\"attributes\\":{\\"color\\":[\\"shanghai\\",\\"sh2\\",\\"#97D700\\",\\"#000\\"],\\"type\\":\\"diagonal\\",\\"diagonal\\":{\\"startFrom\\":\\"to\\",\\"offsetFrom\\":0,\\"offsetTo\\":0}}},{\\"key\\":\\"line_2_2\\",\\"source\\":\\"stn_2\\",\\"target\\":\\"stn_5\\",\\"attributes\\":{\\"color\\":[\\"shanghai\\",\\"sh2\\",\\"#97D700\\",\\"#000\\"],\\"type\\":\\"diagonal\\",\\"diagonal\\":{\\"startFrom\\":\\"from\\",\\"offsetFrom\\":0,\\"offsetTo\\":100}}}]}"}';

const initialState: AppState = {
    counter: 0,
    graph: initGraph,
    ...JSON.parse(localStorage.getItem('AppState') ?? initGraph),
};

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        bumpCounter: state => {
            state.counter++;
        },
        saveGraph: (state, action: PayloadAction<string>) => {
            state.graph = action.payload;
        },
    },
});

export const { bumpCounter, saveGraph } = appSlice.actions;
export default appSlice.reducer;
