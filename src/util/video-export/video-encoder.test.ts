import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createVideoFrameWriter, NativeVideoEncodingError, VideoEncodingOptions } from './video-encoder';
import { VideoExportStorageError } from './video-export-destination';
import { VideoOutputFinalizationError } from './video-output';

const mocks = vi.hoisted(() => ({
    canEncodeVideo: vi.fn(),
    add: vi.fn(),
    source: vi.fn(),
    probe: vi.fn(),
    session: vi.fn(),
    audio: vi.fn(),
    complete: vi.fn(),
    dispose: vi.fn(),
    software: vi.fn(),
}));
vi.mock('mediabunny', () => ({
    canEncodeVideo: mocks.canEncodeVideo,
    Quality: class {
        constructor(public value: number) {}
    },
    VideoSampleSource: class {
        constructor(config: unknown) {
            mocks.source(config);
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
}));
vi.mock('./video-encoder-probe', () => ({ probeVideoEncoder: mocks.probe }));
vi.mock('./video-output', () => ({
    createVideoOutputSession: mocks.session,
    VideoOutputFinalizationError: class extends Error {
        constructor(cause: unknown) {
            super('Finalization failed', { cause });
        }
    },
}));
vi.mock('./video-encoder-software', () => ({ createSoftwareVideoFrameWriter: mocks.software }));

const options: VideoEncodingOptions = { format: 'mp4', fps: 30, quality: 95, isTransparent: false };
let canvas: HTMLCanvasElement;
beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('VideoEncoder', class {});
    vi.stubGlobal('VideoFrame', class {});
    mocks.canEncodeVideo.mockResolvedValue(true);
    mocks.probe.mockResolvedValue(undefined);
    mocks.add.mockResolvedValue(undefined);
    mocks.audio.mockResolvedValue(undefined);
    mocks.complete.mockResolvedValue({ kind: 'memory-blob', blob: new Blob(['video'], { type: 'video/mp4' }) });
    mocks.session.mockResolvedValue({ addAudioUntil: mocks.audio, complete: mocks.complete, dispose: mocks.dispose });
    canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('bounded browser video encoding', () => {
    it.each([
        [1280, 720, 30, 'avc1.42001f'],
        [1280, 720, 60, 'avc1.420020'],
        [1920, 1080, 30, 'avc1.420028'],
        [1920, 1080, 60, 'avc1.42002a'],
        [2560, 1440, 30, 'avc1.420032'],
        [2560, 1440, 60, 'avc1.420033'],
        [3840, 2160, 30, 'avc1.420033'],
        [3840, 2160, 60, 'avc1.420034'],
    ] as const)('retains AVC baseline compatibility for %ix%i at %i FPS', async (width, height, fps, codec) => {
        canvas.width = width;
        canvas.height = height;
        const requested = { ...options, fps };
        await createVideoFrameWriter(canvas, requested);
        expect(mocks.probe).toHaveBeenCalledWith(
            canvas,
            expect.objectContaining({
                fullCodecString: codec,
                hardwareAcceleration: 'prefer-hardware',
                latencyMode: 'quality',
            }),
            requested
        );
    });
    it('finishes hardware fallback probing before opening the export destination', async () => {
        mocks.probe.mockRejectedValueOnce(new Error('Hardware failed at 60 FPS'));
        await createVideoFrameWriter(canvas, { ...options, fps: 60 });
        expect(mocks.probe.mock.calls.map(call => call[1].hardwareAcceleration)).toEqual([
            'prefer-hardware',
            'no-preference',
        ]);
        expect(mocks.source).toHaveBeenCalledWith(expect.objectContaining({ hardwareAcceleration: 'no-preference' }));
        expect(mocks.session).toHaveBeenCalledOnce();
        expect(mocks.software).not.toHaveBeenCalled();
    });
    it.each([30, 60])('preserves timestamps and interleaves audio at %i FPS', async fps => {
        const writer = await createVideoFrameWriter(canvas, { ...options, fps });
        await writer.addFrame(0);
        await writer.addFrame(fps);
        const result = await writer.complete();
        await writer.dispose();
        expect(mocks.add.mock.calls.map(([sample]) => [sample.timestamp, sample.duration])).toEqual([
            [0, 1 / fps],
            [1, 1 / fps],
        ]);
        expect(mocks.audio.mock.calls).toEqual([[0], [1 / fps], [1], [(fps + 1) / fps]]);
        expect(mocks.complete).toHaveBeenCalledWith((fps + 1) / fps);
        expect(result).toMatchObject({ kind: 'memory-blob' });
        expect(mocks.add.mock.calls.every(([sample]) => sample.close.mock.calls.length === 1)).toBe(true);
        expect(mocks.dispose).toHaveBeenCalledOnce();
    });
    it('tries hardware VP8 when hardware VP9 is unsupported', async () => {
        mocks.canEncodeVideo.mockImplementation(async codec => codec === 'vp8');
        await createVideoFrameWriter(canvas, { ...options, format: 'webm' });
        expect(mocks.source).toHaveBeenCalledWith(
            expect.objectContaining({ codec: 'vp8', hardwareAcceleration: 'prefer-hardware' })
        );
    });
    it('really probes transparent WebM with its alpha and FPS settings', async () => {
        await createVideoFrameWriter(canvas, { ...options, format: 'webm', isTransparent: true, fps: 60 });
        expect(mocks.probe).toHaveBeenCalledWith(
            canvas,
            expect.objectContaining({ alpha: 'keep' }),
            expect.objectContaining({ fps: 60 })
        );
    });
    it('passes audio, destination and signal to the unified output', async () => {
        const requested = {
            ...options,
            audioTracks: [{ blob: new Blob(['m4a']), start: 0.35, end: 3.2 }],
            destinationFactory: vi.fn(),
            signal: new AbortController().signal,
        };
        await createVideoFrameWriter(canvas, requested);
        expect(mocks.session).toHaveBeenCalledWith(expect.anything(), requested);
    });
    it('bounds a stalled frame and disposes its output', async () => {
        vi.useFakeTimers();
        mocks.add.mockImplementation(() => new Promise(() => {}));
        const writer = await createVideoFrameWriter(canvas, options);
        const assertion = expect(writer.addFrame(0)).rejects.toBeInstanceOf(NativeVideoEncodingError);
        await vi.advanceTimersByTimeAsync(30_000);
        await assertion;
        await writer.dispose();
        expect(mocks.dispose).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });
    it('cancels a pending frame without falling back to WASM', async () => {
        mocks.add.mockImplementation(() => new Promise(() => {}));
        const controller = new AbortController();
        const writer = await createVideoFrameWriter(canvas, { ...options, signal: controller.signal });
        const pending = writer.addFrame(0);
        await vi.waitFor(() => expect(mocks.add).toHaveBeenCalled());
        controller.abort();
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
        expect(mocks.add.mock.calls[0][0].close).toHaveBeenCalledOnce();
        expect(mocks.software).not.toHaveBeenCalled();
        await writer.dispose();
    });
    it.each(['frame', 'complete'] as const)('preserves a %s disk failure without a video retry', async stage => {
        const error = new VideoExportStorageError('Disk full');
        if (stage === 'frame') mocks.add.mockRejectedValue(error);
        else mocks.complete.mockRejectedValue(error);
        const writer = await createVideoFrameWriter(canvas, options);
        await expect(stage === 'frame' ? writer.addFrame(0) : writer.complete()).rejects.toBe(error);
    });
    it('does not rerender video when the audio source fails', async () => {
        const error = new Error('Could not decode audio');
        mocks.audio.mockRejectedValue(error);
        const writer = await createVideoFrameWriter(canvas, options);
        await expect(writer.addFrame(0)).rejects.toBe(error);
        expect(mocks.add).not.toHaveBeenCalled();
    });
    it('marks video encoder finalization failures for software retry', async () => {
        mocks.complete.mockRejectedValue(new VideoOutputFinalizationError(new Error('Encoder closed')));
        const writer = await createVideoFrameWriter(canvas, options);
        await expect(writer.complete()).rejects.toBeInstanceOf(NativeVideoEncodingError);
    });
    it.each(['missing-api', 'unsupported', 'probe-error', 'forced'])(
        'keeps settings in the %s software fallback',
        async reason => {
            if (reason === 'missing-api') vi.stubGlobal('VideoEncoder', undefined);
            if (reason === 'unsupported') mocks.canEncodeVideo.mockResolvedValue(false);
            if (reason === 'probe-error') mocks.probe.mockRejectedValue(new Error('Unsupported'));
            await createVideoFrameWriter(canvas, options, reason === 'forced');
            expect(mocks.software).toHaveBeenCalledWith(canvas, options);
            expect(mocks.session).not.toHaveBeenCalled();
        }
    );
});
