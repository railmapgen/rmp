import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextLanguage } from './fonts';

const runtime = vi.hoisted(() => ({
    loadFont: vi.fn(),
    getLoadedFonts: vi.fn(),
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
