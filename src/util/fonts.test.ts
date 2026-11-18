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
        runtime.getFontCSS.mockImplementation(async (name: string) => `@font-face { font-family: '${name}'; }`);
        Object.defineProperty(document, 'fonts', {
            configurable: true,
            value: { ready: Promise.resolve(), delete: vi.fn() },
        });
        fonts = await import('./fonts');
    });

    afterEach(() => {
        if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
        else Reflect.deleteProperty(document, 'fonts');
        vi.restoreAllMocks();
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

    it('shares pending registration across languages and lets later requests reach runtime', async () => {
        const registration = deferred<ReturnType<typeof makeFont>>();
        runtime.loadFont.mockReturnValueOnce(registration.promise);

        const jrEast = fonts.loadFont(TextLanguage.jreast_ja);
        const tokyo = fonts.loadFont(TextLanguage.tokyo_ja);
        expect(jrEast).toBe(tokyo);
        const complete = vi.fn();
        void jrEast.then(complete);
        await vi.waitFor(() => expect(runtime.loadFont).toHaveBeenCalledOnce());
        expect(complete).not.toHaveBeenCalled();

        const font = makeFont();
        registration.resolve(font);
        await Promise.all([jrEast, tokyo]);
        const later = fonts.loadFont(TextLanguage.tokyo_ja);
        expect(later).not.toBe(jrEast);
        await later;
        expect(runtime.loadFont).toHaveBeenCalledTimes(2);
        expect(font.configs[0].font.load).not.toHaveBeenCalled();
    });

    it('retries registration without removing or changing runtime font records', async () => {
        const font = makeFont();
        Object.defineProperty(font.configs[0].font, 'status', { value: 'error' });
        Object.freeze(font.configs[0]);
        Object.freeze(font.configs);
        loadedFonts.LTAIdentity = font;
        runtime.loadFont.mockRejectedValueOnce(new Error('Font service unavailable'));

        await expect(fonts.loadFont(TextLanguage.mrt)).rejects.toThrow('Font service unavailable');
        await expect(fonts.loadFont(TextLanguage.mrt)).resolves.toBeUndefined();
        expect(runtime.loadFont).toHaveBeenCalledTimes(2);
        expect(runtime.getLoadedFonts).not.toHaveBeenCalled();
        expect(loadedFonts.LTAIdentity).toBe(font);
        expect(document.fonts.delete).not.toHaveBeenCalled();
        expect(font.configs[0].font.load).not.toHaveBeenCalled();
    });

    it('flushes mounted layout and waits for browser readiness without eagerly loading faces', async () => {
        const browserReady = deferred();
        Object.defineProperty(document.fonts, 'ready', { configurable: true, value: browserReady.promise });
        const layout = vi.spyOn(document.body, 'getBoundingClientRect');
        const complete = vi.fn();
        const preparation = fonts.waitForFonts([TextLanguage.mrt, TextLanguage.mrt]).then(complete);

        await vi.waitFor(() => expect(layout).toHaveBeenCalledOnce());
        expect(loadedFonts.LTAIdentity.configs[0].font.load).not.toHaveBeenCalled();
        expect(complete).not.toHaveBeenCalled();
        browserReady.resolve();
        await preparation;
        expect(complete).toHaveBeenCalledOnce();
        expect(runtime.loadFont).toHaveBeenCalledOnce();
    });

    it('propagates registration failures', async () => {
        runtime.loadFont.mockRejectedValueOnce(new Error('Font service unavailable'));
        await expect(fonts.waitForFonts([TextLanguage.mrt])).rejects.toThrow('Font service unavailable');
    });

    it('does not interpret browser readiness as success for every subset', async () => {
        const font = makeFont();
        Object.defineProperty(font.configs[0].font, 'status', { value: 'error' });
        loadedFonts.LTAIdentity = font;

        await expect(fonts.waitForFonts([TextLanguage.mrt])).resolves.toBeUndefined();
        expect(font.configs[0].font.load).not.toHaveBeenCalled();
    });

    it('cancels only the caller waiting for shared registration', async () => {
        const registration = deferred<ReturnType<typeof makeFont>>();
        runtime.loadFont.mockReturnValueOnce(registration.promise);
        const controller = new AbortController();
        const cancelled = fonts.waitForFonts([TextLanguage.mrt], controller.signal);
        const waiting = fonts.waitForFonts([TextLanguage.mrt]);
        const rejection = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });

        controller.abort();
        await rejection;
        registration.resolve(makeFont());
        await expect(waiting).resolves.toBeUndefined();
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

    it('registers shared families from the manifest without downloading their subsets', async () => {
        for (const language of [TextLanguage.zh, TextLanguage.en, TextLanguage.taipei]) {
            await fonts.loadFont(language);
        }

        expect(runtime.loadFont.mock.calls).toEqual([
            ['Noto Sans CJK SC', undefined],
            ['Arimo', undefined],
            ['Taipei Sans TC Beta', undefined],
        ]);
        for (const font of Object.values(loadedFonts)) expect(font.configs[0].font.load).not.toHaveBeenCalled();
    });

    it('waits for layout and embeds each family once without rewriting runtime CSS', async () => {
        const browserReady = deferred();
        Object.defineProperty(document.fonts, 'ready', { configurable: true, value: browserReady.promise });
        const css =
            '@font-face { src: url("data:font/woff2;base64,Zm9udA=="); unicode-range: U+0-FF; font-weight: 400; }';
        runtime.getFontCSS.mockResolvedValue(css);
        const preparation = fonts.makeBase64EncodedFontsStyle([TextLanguage.jreast_ja, TextLanguage.tokyo_ja]);

        await vi.waitFor(() => expect(runtime.loadFont).toHaveBeenCalledOnce());
        expect(runtime.getFontCSS).not.toHaveBeenCalled();
        browserReady.resolve();
        expect((await preparation).textContent).toBe(css);
        expect(runtime.getFontCSS.mock.calls).toEqual([['M PLUS 2']]);
    });

    it('refreshes embedded CSS for later subsets while preserving unrelated styles', async () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.innerHTML = '<style>.outline{fill:red}</style>';
        runtime.getFontCSS
            .mockResolvedValueOnce('@font-face { unicode-range: U+0-FF; }')
            .mockResolvedValueOnce('@font-face { unicode-range: U+20000-207FF; }');

        await fonts.updateEmbeddedFonts(svg, [TextLanguage.zh]);
        await fonts.updateEmbeddedFonts(svg, [TextLanguage.zh]);
        expect(svg.querySelectorAll('style[data-rmp-fonts]')).toHaveLength(1);
        expect(svg.querySelector('style[data-rmp-fonts]')?.textContent).toContain('U+20000-207FF');
        expect(svg.innerHTML).toContain('.outline{fill:red}');
        expect(runtime.loadFont).toHaveBeenCalledTimes(2);
        expect(runtime.getFontCSS).toHaveBeenCalledTimes(2);
    });
});
