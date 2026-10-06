import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createVideoFrameWriter, NativeVideoEncodingError, VideoEncodingOptions } from './video-encoder';

const mocks = vi.hoisted(() => ({
    canEncodeVideo: vi.fn(),
    add: vi.fn(),
    finalize: vi.fn(),
    cancel: vi.fn(),
    addVideoTrack: vi.fn(),
    software: vi.fn(),
    muxVideoAudio: vi.fn(),
}));

vi.mock('mediabunny', () => ({
    canEncodeVideo: mocks.canEncodeVideo,
    Quality: class {
        constructor(public value: number) {}
    },
    BufferTarget: class {
        buffer = new ArrayBuffer(8);
    },
    Mp4OutputFormat: class {},
    WebMOutputFormat: class {},
    CanvasSource: class {
        add = mocks.add;
    },
    Output: class {
        state = 'started';
        addVideoTrack = mocks.addVideoTrack;
        start = vi.fn();
        cancel = mocks.cancel;
        async finalize() {
            await mocks.finalize();
            this.state = 'finalized';
        }
    },
}));
vi.mock('./video-encoder-software', () => ({ createSoftwareVideoFrameWriter: mocks.software }));
vi.mock('./video-audio-mux', () => ({ muxVideoAudio: mocks.muxVideoAudio }));

const options: VideoEncodingOptions = { format: 'mp4', fps: 30, quality: 95, isTransparent: false };
let canvas: HTMLCanvasElement;

beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('VideoEncoder', class {});
    vi.stubGlobal('VideoFrame', class {});
    mocks.canEncodeVideo.mockResolvedValue(true);
    mocks.add.mockResolvedValue(undefined);
    mocks.muxVideoAudio.mockResolvedValue(new Blob(['video with soundtrack'], { type: 'video/mp4' }));
    canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('browser video encoding', () => {
    it.each([
        [1280, 720, 30, 'avc1.42001f'],
        [1280, 720, 60, 'avc1.420020'],
        [1920, 1080, 30, 'avc1.420028'],
        [1920, 1080, 60, 'avc1.42002a'],
        [2560, 1440, 30, 'avc1.420032'],
        [2560, 1440, 60, 'avc1.420033'],
        [3840, 2160, 30, 'avc1.420033'],
        [3840, 2160, 60, 'avc1.420034'],
    ] as const)(
        'uses a compatible AVC baseline level for %ix%i at %i FPS',
        async (width, height, fps, fullCodecString) => {
            canvas.width = width;
            canvas.height = height;
            const writer = await createVideoFrameWriter(canvas, { ...options, fps });
            expect(mocks.canEncodeVideo).toHaveBeenCalledWith(
                'avc',
                expect.objectContaining({
                    fullCodecString,
                    latencyMode: 'quality',
                })
            );
            await writer.dispose();
        }
    );

    it('turns a stalled native frame into a retryable failure and releases the encoder', async () => {
        vi.useFakeTimers();
        mocks.add.mockImplementation(() => new Promise(() => {}));
        const writer = await createVideoFrameWriter(canvas, options);
        const assertion = expect(writer.addFrame(0)).rejects.toBeInstanceOf(NativeVideoEncodingError);
        await vi.advanceTimersByTimeAsync(30_000);
        await assertion;
        await writer.dispose();
        expect(mocks.cancel).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });

    it.each([30, 60])('writes MP4 directly with the frame clock at %i FPS', async fps => {
        const writer = await createVideoFrameWriter(canvas, { ...options, fps });
        await writer.addFrame(0);
        await writer.addFrame(fps);
        const blob = await writer.complete();
        await writer.dispose();
        expect(mocks.canEncodeVideo).toHaveBeenCalledWith(
            'avc',
            expect.objectContaining({ width: 1920, height: 1080 })
        );
        expect(mocks.addVideoTrack).toHaveBeenCalledWith(expect.anything(), { frameRate: fps });
        expect(mocks.add.mock.calls).toEqual([
            [0, 1 / fps],
            [1, 1 / fps],
        ]);
        expect(blob.type).toBe('video/mp4');
        expect(blob.size).toBeGreaterThan(0);
        expect(mocks.software).not.toHaveBeenCalled();
        expect(mocks.cancel).not.toHaveBeenCalled();
    });

    it('tries VP8 if the selected WebM dimensions cannot be encoded with VP9', async () => {
        mocks.canEncodeVideo.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
        const writer = await createVideoFrameWriter(canvas, { ...options, format: 'webm' });
        expect((await writer.complete()).type).toBe('video/webm');
        expect(mocks.canEncodeVideo.mock.calls.map(call => call[0])).toEqual(['vp9', 'vp8']);
        expect(mocks.software).not.toHaveBeenCalled();
    });

    it('preserves transparency in the native WebM path', async () => {
        const writer = await createVideoFrameWriter(canvas, { ...options, format: 'webm', isTransparent: true });
        expect(mocks.canEncodeVideo).toHaveBeenCalledWith('vp9', expect.objectContaining({ alpha: 'keep' }));
        expect((await writer.complete()).type).toBe('video/webm');
        expect(mocks.software).not.toHaveBeenCalled();
    });

    it.each(['mp4', 'webm'] as const)(
        'keeps native %s video encoding when an M4A soundtrack is present',
        async format => {
            const requested = {
                ...options,
                format,
                audioTracks: [{ blob: new Blob(['m4a'], { type: 'audio/mp4' }), start: 0.35, end: 3.2 }],
            };
            const soundtrack = new Blob(['muxed video'], { type: `video/${format}` });
            mocks.muxVideoAudio.mockResolvedValueOnce(soundtrack);
            const writer = await createVideoFrameWriter(canvas, requested);
            await writer.addFrame(0);
            await writer.addFrame(1);
            expect(mocks.muxVideoAudio).not.toHaveBeenCalled();
            expect(await writer.complete()).toBe(soundtrack);
            expect(mocks.finalize).toHaveBeenCalledOnce();
            expect(mocks.muxVideoAudio).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({ type: `video/${format}` }),
                requested
            );
            expect(mocks.add.mock.calls).toEqual([
                [0, 1 / 30],
                [1 / 30, 1 / 30],
            ]);
            expect(mocks.software).not.toHaveBeenCalled();
            await writer.dispose();
        }
    );

    it('does not retry rendering the video when audio muxing fails', async () => {
        const requested = { ...options, audioTracks: [{ blob: new Blob(['broken']), start: 0, end: 1 }] };
        const error = new Error('Audio stream could not be decoded');
        mocks.muxVideoAudio.mockRejectedValueOnce(error);
        const writer = await createVideoFrameWriter(canvas, requested);
        await writer.addFrame(0);
        await expect(writer.complete()).rejects.toBe(error);
        expect(mocks.software).not.toHaveBeenCalled();
        await writer.dispose();
        expect(mocks.cancel).not.toHaveBeenCalled();
    });

    it.each(['missing-api', 'unsupported', 'retry'])(
        'retains the M4A soundtrack in the %s software fallback',
        async reason => {
            const requested = {
                ...options,
                audioTracks: [{ blob: new Blob(['m4a'], { type: 'audio/mp4' }), start: 0.2, end: 1.5 }],
            };
            if (reason === 'missing-api') vi.stubGlobal('VideoEncoder', undefined);
            if (reason === 'unsupported') mocks.canEncodeVideo.mockResolvedValue(false);
            await createVideoFrameWriter(canvas, requested, reason === 'retry');
            expect(mocks.software).toHaveBeenCalledExactlyOnceWith(canvas, requested);
            expect(mocks.muxVideoAudio).not.toHaveBeenCalled();
        }
    );

    it.each(['missing-api', 'unsupported', 'probe-error', 'retry'])(
        'uses software encoding for %s without changing the requested settings',
        async reason => {
            const requested = { ...options };
            if (reason === 'missing-api') vi.stubGlobal('VideoEncoder', undefined);
            if (reason === 'unsupported') mocks.canEncodeVideo.mockResolvedValue(false);
            if (reason === 'probe-error') mocks.canEncodeVideo.mockRejectedValue(new Error('Codec unavailable'));
            await createVideoFrameWriter(canvas, requested, reason === 'retry');
            expect(mocks.software).toHaveBeenCalledExactlyOnceWith(canvas, requested);
        }
    );

    it.each(['add', 'finalize'] as const)(
        'marks a %s failure for retry and releases the native encoder',
        async method => {
            const error = new Error('Encoder resource exhausted');
            mocks[method].mockRejectedValue(error);
            const writer = await createVideoFrameWriter(canvas, options);
            await expect(method === 'add' ? writer.addFrame(0) : writer.complete()).rejects.toBeInstanceOf(
                NativeVideoEncodingError
            );
            await writer.dispose();
            expect(mocks.cancel).toHaveBeenCalledOnce();
        }
    );
});
