import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSoftwareVideoFrameWriter } from './video-encoder-software';
import type { VideoEncodingOptions } from './video-encoder';

const mocks = vi.hoisted(() => ({
    load: vi.fn(),
    exec: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readFile: vi.fn(),
    terminate: vi.fn(),
    files: new Map<string, Uint8Array>(),
}));
vi.mock('@ffmpeg/ffmpeg', () => ({ FFmpeg: vi.fn(() => mocks) }));

const options: VideoEncodingOptions = { format: 'mp4', fps: 30, quality: 95, isTransparent: false };
let canvas: HTMLCanvasElement;
beforeEach(() => {
    vi.resetAllMocks();
    mocks.files.clear();
    mocks.exec.mockResolvedValue(0);
    mocks.writeFile.mockImplementation(async (name, data) => {
        mocks.files.set(name, data);
    });
    mocks.deleteFile.mockImplementation(async name => {
        mocks.files.delete(name);
    });
    mocks.readFile.mockResolvedValue(new Uint8Array([0, 1, 2, 3]));
    canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    vi.spyOn(canvas, 'toBlob').mockImplementation(callback =>
        callback({
            size: 4,
            arrayBuffer: async () => new ArrayBuffer(4),
        } as Blob)
    );
    vi.spyOn(canvas, 'toDataURL').mockImplementation(() => {
        throw new Error('WebP encoding unavailable');
    });
});
afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('software video encoding', () => {
    it.each([30, 60])('encodes PNG batches and joins them with exact durations at %i FPS', async fps => {
        const writer = await createSoftwareVideoFrameWriter(canvas, { ...options, fps });
        for (let frame = 0; frame < 31; frame++) await writer.addFrame(frame);
        // Only the last partial batch remains; the first 30 PNGs have already been released.
        expect(mocks.files.size).toBe(1);
        const blob = await writer.complete();
        expect(blob.type).toBe('video/mp4');
        expect(mocks.exec.mock.calls).toHaveLength(3);
        expect(mocks.exec.mock.calls[0][0]).toContain('libx264');
        expect(mocks.exec.mock.calls[2][0]).toEqual(expect.arrayContaining(['concat', 'copy', '+faststart']));
        expect(new TextDecoder().decode(mocks.files.get('segments.txt'))).toBe(
            `file 'segment-0.mp4'\nduration ${30 / fps}\nfile 'segment-1.mp4'\nduration ${Math.round(1_000_000 / fps) / 1_000_000}\n`
        );
        expect([...mocks.files.keys()].some(name => name.endsWith('.png'))).toBe(false);
        expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
        expect(canvas.toDataURL).not.toHaveBeenCalled();
        await writer.dispose();
        expect(mocks.terminate).toHaveBeenCalledOnce();
    });

    it('limits 4K batches to one frame and retains alpha for transparent WebM', async () => {
        canvas.width = 3840;
        canvas.height = 2160;
        const writer = await createSoftwareVideoFrameWriter(canvas, {
            ...options,
            format: 'webm',
            isTransparent: true,
        });
        await writer.addFrame(0);
        expect(mocks.files.size).toBe(0);
        expect(mocks.exec.mock.calls[0][0]).toEqual(expect.arrayContaining(['libvpx', 'yuva420p']));
        expect((await writer.complete()).type).toBe('video/webm');
        await writer.dispose();
    });

    it('deletes partial PNG batches on encoder failure', async () => {
        const writer = await createSoftwareVideoFrameWriter(canvas, options);
        await writer.addFrame(0);
        mocks.exec.mockResolvedValueOnce(1);
        await expect(writer.complete()).rejects.toThrow('code 1');
        expect(mocks.files.size).toBe(0);
        await writer.dispose();
        expect(mocks.terminate).toHaveBeenCalledOnce();
    });

    it('keeps short-batch durations on the frame clock without cumulative rounding drift', async () => {
        canvas.width = 3840;
        canvas.height = 2160;
        const writer = await createSoftwareVideoFrameWriter(canvas, { ...options, fps: 60 });
        for (let frame = 0; frame < 60; frame++) await writer.addFrame(frame);
        await writer.complete();
        const manifest = new TextDecoder().decode(mocks.files.get('segments.txt'));
        const durations = [...manifest.matchAll(/duration ([\d.]+)/g)].map(match => Number(match[1]));
        expect(durations).toHaveLength(60);
        let total = 0;
        durations.forEach((duration, frame) => {
            total += duration;
            expect(Math.abs(total - (frame + 1) / 60)).toBeLessThan(0.000001);
        });
        expect(total).toBeCloseTo(1, 9);
        await writer.dispose();
    });

    it('reports a missing PNG instead of adding a corrupt frame', async () => {
        vi.mocked(canvas.toBlob).mockImplementation(callback => callback(null));
        const writer = await createSoftwareVideoFrameWriter(canvas, options);
        await expect(writer.addFrame(0)).rejects.toThrow('Could not encode video frame');
        expect(mocks.writeFile).not.toHaveBeenCalled();
        await writer.dispose();
    });

    it('terminates the worker when loading fails', async () => {
        mocks.load.mockRejectedValueOnce(new Error('WASM unavailable'));
        await expect(createSoftwareVideoFrameWriter(canvas, options)).rejects.toThrow('WASM unavailable');
        expect(mocks.terminate).toHaveBeenCalledOnce();
    });

    it('aborts a stalled load and releases the worker', async () => {
        vi.useFakeTimers();
        mocks.load.mockImplementation(
            (_urls, { signal }: { signal: AbortSignal }) =>
                new Promise((_, reject) => {
                    signal.addEventListener('abort', () => reject(new Error('Load aborted')));
                })
        );
        const result = expect(createSoftwareVideoFrameWriter(canvas, options)).rejects.toThrow('Load aborted');
        await vi.advanceTimersByTimeAsync(90_000);
        await result;
        expect(mocks.terminate).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });
});
