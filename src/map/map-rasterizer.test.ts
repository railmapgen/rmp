import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanvasMapRasterizer } from './map-rasterizer';

describe('CanvasMapRasterizer', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('loads SVG through an image and encodes the canvas as WebP', async () => {
        const NativeUrl = URL;
        class TestUrl extends NativeUrl {}
        TestUrl.createObjectURL = vi.fn(() => 'blob:map-svg');
        TestUrl.revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', TestUrl);

        const image = document.createElement('img');
        const context = {
            clearRect: vi.fn(),
            drawImage: vi.fn(),
        };
        const raster = new Blob(['raster'], { type: 'image/webp' });
        const canvas = document.createElement('canvas');
        canvas.getContext = vi.fn(() => context) as unknown as typeof canvas.getContext;
        canvas.toBlob = vi.fn(callback => callback(raster));
        const rasterizer = new CanvasMapRasterizer(canvas, () => image);

        const result = rasterizer.render('<svg xmlns="http://www.w3.org/2000/svg"/>', 256);
        image.dispatchEvent(new Event('load'));

        await expect(result).resolves.toBe(raster);
        expect(canvas.width).toBe(256);
        expect(canvas.height).toBe(256);
        expect(context.clearRect).toHaveBeenCalledWith(0, 0, 256, 256);
        expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 256, 256);
        expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.92);
        expect(TestUrl.revokeObjectURL).toHaveBeenCalledWith('blob:map-svg');
    });

    it('rejects pending rendering when disposed', async () => {
        const NativeUrl = URL;
        class TestUrl extends NativeUrl {}
        TestUrl.createObjectURL = vi.fn(() => 'blob:map-svg');
        TestUrl.revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', TestUrl);

        const image = document.createElement('img');
        const rasterizer = new CanvasMapRasterizer(document.createElement('canvas'), () => image);
        const result = rasterizer.render('<svg xmlns="http://www.w3.org/2000/svg"/>', 256);
        const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' });

        rasterizer.dispose();

        await rejection;
        expect(TestUrl.revokeObjectURL).toHaveBeenCalledWith('blob:map-svg');
    });
});
