import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderVideoSVGToCanvas } from './video-export-rasterizer';

const images: FakeImage[] = [];
class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src = '';
    removeAttribute = vi.fn();
    constructor() {
        images.push(this);
    }
}
let svg: SVGSVGElement;
let canvas: HTMLCanvasElement;
let draw: ReturnType<typeof vi.fn>;
let createURL: ReturnType<typeof vi.fn>;
let revokeURL: ReturnType<typeof vi.fn>;
beforeEach(() => {
    images.length = 0;
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.innerHTML =
        '<style>@font-face{font-family:test;src:url(data:font/woff2;base64,AA==)}</style><text>车站 🚉</text>';
    canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    draw = vi.fn();
    vi.spyOn(canvas, 'getContext').mockReturnValue({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        drawImage: draw,
    } as unknown as CanvasRenderingContext2D);
    createURL = vi.fn(() => `blob:frame-${images.length}`);
    revokeURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: createURL, revokeObjectURL: revokeURL });
    vi.stubGlobal('Image', FakeImage);
});
afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('export SVG resource lifetime', () => {
    it('uses a self-contained SVG Blob and releases it after drawing', async () => {
        const operation = renderVideoSVGToCanvas(svg, canvas, false, 'white');
        expect(images[0].src).toBe('blob:frame-0');
        const blob = createURL.mock.calls[0][0] as Blob;
        expect(blob.type).toBe('image/svg+xml;charset=utf-8');
        images[0].onload!();
        await operation;
        expect(draw).toHaveBeenCalledWith(images[0], 0, 0, 1920, 1080);
        expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:frame-0');
        expect(images[0].onload).toBeNull();
        expect(images[0].onerror).toBeNull();
        expect(images[0].removeAttribute).toHaveBeenCalledWith('src');
    });
    it.each(['decode', 'draw'] as const)('releases failed %s resources', async stage => {
        if (stage === 'draw')
            draw.mockImplementation(() => {
                throw new Error('Draw failed');
            });
        const operation = renderVideoSVGToCanvas(svg, canvas, true, 'white');
        const assertion = expect(operation).rejects.toThrow(stage === 'decode' ? 'Could not render' : 'Draw failed');
        if (stage === 'decode') images[0].onerror!();
        else images[0].onload!();
        await assertion;
        expect(revokeURL).toHaveBeenCalledOnce();
        expect(images[0].onload).toBeNull();
    });
    it('cancels a pending decode and ignores a late image callback', async () => {
        const controller = new AbortController();
        const operation = renderVideoSVGToCanvas(svg, canvas, false, 'white', controller.signal);
        const assertion = expect(operation).rejects.toMatchObject({ name: 'AbortError' });
        controller.abort();
        await assertion;
        expect(draw).not.toHaveBeenCalled();
        expect(images[0].onload).toBeNull();
        expect(revokeURL).toHaveBeenCalledOnce();
    });
    it('times out without retaining URL, handlers or timer', async () => {
        vi.useFakeTimers();
        const operation = renderVideoSVGToCanvas(svg, canvas, false, 'white');
        const assertion = expect(operation).rejects.toThrow('timed out');
        await vi.advanceTimersByTimeAsync(30_000);
        await assertion;
        expect(revokeURL).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });
    it('does not accumulate live URLs across consecutive frames', async () => {
        for (let frame = 0; frame < 100; frame++) {
            const operation = renderVideoSVGToCanvas(svg, canvas, false, 'white');
            images[frame].onload!();
            await operation;
            expect(revokeURL).toHaveBeenCalledTimes(frame + 1);
            expect(images.every(image => image.onload === null && image.onerror === null)).toBe(true);
        }
    });
});
