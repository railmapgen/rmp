import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TextLanguage } from '../../util/fonts';

interface FontsState {
    /**
     * List of languages that are used in the map.
     * When added, the followings will try to load the font for the language (if available).
     *   1. useFonts hook
     *   2. loadFonts in download (image rendering)
     */
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
        loadFonts: (state, action: PayloadAction<TextLanguage[]>) => {
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
