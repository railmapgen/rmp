import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { probeVideoEncoder } from './video-encoder-probe';

const mocks = vi.hoisted(() => ({
    add: vi.fn(),
    finalize: vi.fn(),
    cancel: vi.fn(),
    track: vi.fn(),
    start: vi.fn(),
    config: vi.fn(),
}));
vi.mock('mediabunny', () => ({
    BufferTarget: class {},
    Mp4OutputFormat: class {},
    WebMOutputFormat: class {},
    VideoSampleSource: class {
        constructor(config: unknown) {
            mocks.config(config);
        }
        add = mocks.add;
    },
    VideoSample: class {
        timestamp: number;
        duration: number;
        close = vi.fn();
        constructor(_canvas: HTMLCanvasElement, timing: { timestamp: number; duration: number }) {
            this.timestamp = timing.timestamp;
            this.duration = timing.duration;
        }
    },
    Output: class {
        state = 'started';
        addVideoTrack = mocks.track;
        start = mocks.start;
        cancel = mocks.cancel;
        async finalize() {
            await mocks.finalize();
            this.state = 'finalized';
        }
    },
}));
const options = { format: 'mp4' as const, fps: 60, quality: 95, isTransparent: false };
const config = {
    codec: 'avc' as const,
    bitrate: 10_000_000,
    hardwareAcceleration: 'prefer-hardware' as const,
    latencyMode: 'quality' as const,
};
let canvases: HTMLCanvasElement[];
beforeEach(() => {
    vi.resetAllMocks();
    canvases = [];
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
        const element = create(tag);
        if (tag === 'canvas') canvases.push(element as HTMLCanvasElement);
        return element;
    }) as typeof document.createElement);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    mocks.add.mockResolvedValue(undefined);
    mocks.finalize.mockResolvedValue(undefined);
    mocks.cancel.mockResolvedValue(undefined);
    mocks.start.mockResolvedValue(undefined);
});
afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});
describe('actual video encoder preflight', () => {
    it('encodes and flushes real-sized frames at the requested clock then releases the probe canvas', async () => {
        await probeVideoEncoder({ width: 1920, height: 1080 }, config, options);
        expect(mocks.config).toHaveBeenCalledWith(config);
        expect(mocks.track).toHaveBeenCalledWith(expect.anything(), { frameRate: 60 });
        expect(mocks.add.mock.calls.map(([sample]) => [sample.timestamp, sample.duration])).toEqual([
            [0, 1 / 60],
            [1 / 60, 1 / 60],
            [2 / 60, 1 / 60],
        ]);
        expect(mocks.finalize).toHaveBeenCalledOnce();
        expect(mocks.add.mock.calls.every(([sample]) => sample.close.mock.calls.length === 1)).toBe(true);
        expect(canvases[0].width).toBe(0);
        expect(canvases[0].height).toBe(0);
    });
    it('does not accept configuration support when the real encoder fails', async () => {
        mocks.add.mockRejectedValue(new Error('Hardware unavailable'));
        await expect(probeVideoEncoder({ width: 1920, height: 1080 }, config, options)).rejects.toThrow(
            'Hardware unavailable'
        );
        expect(mocks.cancel).toHaveBeenCalledOnce();
        expect(canvases[0].width).toBe(0);
    });
    it('bounds a probe that stalls while flushing', async () => {
        vi.useFakeTimers();
        mocks.finalize.mockImplementation(() => new Promise(() => {}));
        const operation = probeVideoEncoder({ width: 1920, height: 1080 }, config, options);
        const assertion = expect(operation).rejects.toThrow('timed out');
        await vi.advanceTimersByTimeAsync(30_000);
        await assertion;
        expect(mocks.cancel).toHaveBeenCalledOnce();
        expect(canvases[0].width).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
    });
});
