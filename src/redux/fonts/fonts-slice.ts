import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TextLanguage } from '../../util/fonts';

interface FontsState {
    languages: TextLanguage[];
}

const initialState: FontsState = {
    languages: [],
};

const fontSlice = createSlice({
    name: 'fonts',
    initialState,
    reducers: {
        loadFont: (state, action: PayloadAction<TextLanguage>) => {
            state.languages = [...new Set(state.languages).add(action.payload)];
        },
        loadFonts: (state, action: PayloadAction<Set<TextLanguage>>) => {
            const fonts = new Set(state.languages);
            for (const fontName of action.payload) {
                fonts.add(fontName);
            }
            state.languages = [...fonts];
        },
    },
});

export const { loadFont, loadFonts } = fontSlice.actions;
export default fontSlice.reducer;
