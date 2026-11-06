import { describe, expect, it } from 'vitest';
import { TextLanguage } from '../../util/fonts';
import reducer, { loadFont, loadFonts } from './fonts-slice';

describe('font language preparation', () => {
    it('prepares default Chinese and English before any resource requests a special font', () => {
        expect(reducer(undefined, { type: 'init' }).languages).toEqual([TextLanguage.zh, TextLanguage.en]);
    });

    it('retains default fonts and deduplicates additional font requests', () => {
        const state = reducer(undefined, loadFonts([TextLanguage.taipei, TextLanguage.en, TextLanguage.taipei]));

        expect(reducer(state, loadFont(TextLanguage.zh)).languages).toEqual([
            TextLanguage.zh,
            TextLanguage.en,
            TextLanguage.taipei,
        ]);
    });
});
