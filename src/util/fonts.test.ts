import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextLanguage } from './fonts';

const runtime = vi.hoisted(() => ({
    loadFont: vi.fn(),
    getLoadedFonts: vi.fn(),
    getFontCSS: vi.fn(),
}));

vi.mock('@railmapgen/rmg-runtime', () => ({ default: runtime }));

const deferred = <T = void>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
};

const makeFont = () => ({
    configs: [
        { source: 'url("font.ttf")', font: { load: vi.fn().mockResolvedValue(undefined) } as unknown as FontFace },
    ],
});

describe('font preparation', () => {
    let fonts: typeof import('./fonts');
    let loadedFonts: Record<string, ReturnType<typeof makeFont>>;
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
        loadedFonts = {};
        runtime.getLoadedFonts.mockReturnValue(loadedFonts);
        runtime.loadFont.mockImplementation(async (name: string) => (loadedFonts[name] ??= makeFont()));
        runtime.getFontCSS.mockImplementation(async (family: string) => {
            if (!loadedFonts[family]) throw new Error(`Font family ${family} is not loaded`);
            return `@font-face { font-family: '${family}'; }`;
        });
        Object.defineProperty(document, 'fonts', {
            configurable: true,
            value: { ready: Promise.resolve(), delete: vi.fn() },
        });
        fonts = await import('./fonts');
    });

    afterEach(() => {
        if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
        else Reflect.deleteProperty(document, 'fonts');
    });

    it('resolves bundled font files from the application base instead of the current route', async () => {
        await fonts.loadFont(TextLanguage.mrt);
        await fonts.loadFont(TextLanguage.tube);

        expect(runtime.loadFont).toHaveBeenNthCalledWith(1, 'LTAIdentity', {
            configs: [
                {
                    source: 'url("/rmp/fonts/LTAIdentity-Medium.ttf")',
                    descriptors: { display: 'swap' },
                },
            ],
        });
        expect(runtime.loadFont).toHaveBeenNthCalledWith(2, 'Railway', {
            configs: [
                {
                    source: 'url("/rmp/fonts/Railway-PlyE.otf")',
                    descriptors: { display: 'swap' },
                },
            ],
        });
    });

    it.each([
        [TextLanguage.zh, 'Noto Sans CJK SC', 'NotoSansCJKsc-Regular.otf'],
        [TextLanguage.en, 'Arimo', 'Arimo-Regular.ttf'],
    ])('loads the bundled default %s font from the application base', async (language, family, fileName) => {
        await fonts.loadFont(language as TextLanguage);

        expect(runtime.loadFont).toHaveBeenCalledWith(family, {
            configs: [
                {
                    source: `url("/rmp/fonts/${fileName}")`,
                    descriptors: { display: 'swap' },
                },
            ],
        });
        expect(loadedFonts[family].configs[0].font.load).toHaveBeenCalledOnce();
    });

    it('waits for both default fonts and browser layout before embedding a first export', async () => {
        const chinese = deferred<FontFace>();
        const english = deferred<FontFace>();
        const browserReady = deferred();
        const chineseFont = makeFont();
        const englishFont = makeFont();
        vi.mocked(chineseFont.configs[0].font.load).mockReturnValue(chinese.promise);
        vi.mocked(englishFont.configs[0].font.load).mockReturnValue(english.promise);
        loadedFonts['Noto Sans CJK SC'] = chineseFont;
        loadedFonts.Arimo = englishFont;
        Object.defineProperty(document.fonts, 'ready', { configurable: true, value: browserReady.promise });

        const embedding = fonts.makeBase64EncodedFontsStyle(fonts.DEFAULT_LANGUAGES);
        await vi.waitFor(() => expect(englishFont.configs[0].font.load).toHaveBeenCalledOnce());
        expect(runtime.getFontCSS).not.toHaveBeenCalled();
        chinese.resolve(chineseFont.configs[0].font);
        await chinese.promise;
        expect(runtime.getFontCSS).not.toHaveBeenCalled();
        english.resolve(englishFont.configs[0].font);
        await english.promise;
        expect(runtime.getFontCSS).not.toHaveBeenCalled();
        browserReady.resolve();

        const style = await embedding;
        expect(runtime.getFontCSS.mock.calls).toEqual([['Noto Sans CJK SC'], ['Arimo']]);
        expect(style.textContent).toContain("font-family: 'Noto Sans CJK SC'");
        expect(style.textContent).toContain("font-family: 'Arimo'");
    });

    it('keeps successful font faces when another default font fails to download', async () => {
        runtime.loadFont.mockRejectedValueOnce(new Error('Font download failed'));

        const style = await fonts.makeBase64EncodedFontsStyle(fonts.DEFAULT_LANGUAGES);

        expect(style.textContent).toContain("font-family: 'Arimo'");
        expect(style.textContent).not.toContain("font-family: 'Noto Sans CJK SC'");
    });

    it('shares the in-flight download across languages using the same font and reuses success', async () => {
        const download = deferred<FontFace>();
        const font = makeFont();
        vi.mocked(font.configs[0].font.load).mockReturnValue(download.promise);
        runtime.loadFont.mockResolvedValue(font);

        const jrEast = fonts.loadFont(TextLanguage.jreast_ja);
        const tokyo = fonts.loadFont(TextLanguage.tokyo_ja);
        expect(jrEast).toBe(tokyo);
        const complete = vi.fn();
        void jrEast.then(complete);
        await vi.waitFor(() => expect(font.configs[0].font.load).toHaveBeenCalledOnce());
        expect(complete).not.toHaveBeenCalled();

        download.resolve(font.configs[0].font);
        await Promise.all([jrEast, tokyo]);
        expect(fonts.loadFont(TextLanguage.jreast_ja)).toBe(jrEast);
        await fonts.loadFont(TextLanguage.tokyo_ja);
        expect(runtime.loadFont).toHaveBeenCalledOnce();
    });

    it('removes a failed FontFace from the runtime so a retry creates a fresh face', async () => {
        const failedFont = makeFont();
        vi.mocked(failedFont.configs[0].font.load).mockRejectedValue(new Error('Font download failed'));
        loadedFonts.LTAIdentity = failedFont;

        await expect(fonts.loadFont(TextLanguage.mrt)).rejects.toThrow('Font download failed');
        expect(loadedFonts.LTAIdentity).toBeUndefined();
        expect(document.fonts.delete).toHaveBeenCalledWith(failedFont.configs[0].font);
        await expect(fonts.loadFont(TextLanguage.mrt)).resolves.toBeUndefined();
        expect(loadedFonts.LTAIdentity).not.toBe(failedFont);
    });

    it('waits for browser font layout after the requested font faces load', async () => {
        const browserReady = deferred();
        Object.defineProperty(document.fonts, 'ready', { configurable: true, value: browserReady.promise });
        const complete = vi.fn();
        const preparation = fonts.waitForFonts([TextLanguage.mrt, TextLanguage.mrt]).then(complete);

        await vi.waitFor(() => expect(loadedFonts.LTAIdentity?.configs[0].font.load).toHaveBeenCalledOnce());
        expect(complete).not.toHaveBeenCalled();
        browserReady.resolve();
        await preparation;
        expect(complete).toHaveBeenCalledOnce();
        expect(runtime.loadFont).toHaveBeenCalledOnce();
    });

    it('propagates font registration and browser layout failures', async () => {
        runtime.loadFont.mockRejectedValueOnce(new Error('Font service unavailable'));
        await expect(fonts.waitForFonts([TextLanguage.mrt])).rejects.toThrow('Font service unavailable');

        const browserReady = deferred();
        Object.defineProperty(document.fonts, 'ready', { configurable: true, value: browserReady.promise });
        const preparation = fonts.waitForFonts([]);
        browserReady.reject(new Error('Browser font layout failed'));
        await expect(preparation).rejects.toThrow('Browser font layout failed');
    });

    it('cancels only the caller waiting for shared downloads', async () => {
        const registration = deferred<ReturnType<typeof makeFont>>();
        runtime.loadFont.mockReturnValue(registration.promise);
        const controller = new AbortController();
        const cancelled = fonts.waitForFonts([TextLanguage.mrt], controller.signal);
        const waiting = fonts.waitForFonts([TextLanguage.mrt]);
        const rejection = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });

        controller.abort();
        await rejection;
        registration.resolve(makeFont());
        await expect(waiting).resolves.toBeUndefined();
        await expect(fonts.waitForFonts([TextLanguage.mrt])).resolves.toBeUndefined();
        expect(runtime.loadFont).toHaveBeenCalledOnce();
    });

    it('does not start loading fonts for an already cancelled caller', async () => {
        const controller = new AbortController();
        controller.abort();

        await expect(fonts.waitForFonts([TextLanguage.mrt], controller.signal)).rejects.toMatchObject({
            name: 'AbortError',
        });
        expect(runtime.loadFont).not.toHaveBeenCalled();
    });
});
