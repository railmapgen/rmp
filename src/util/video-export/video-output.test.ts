import type { AudioSource, Target, VideoSource } from 'mediabunny';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VideoEncodingOptions } from './video-encoder';
import type { VideoExportAudio } from './video-export-audio';
import { createVideoExportDestination, VideoExportStorageError } from './video-export-destination';
import type { VideoExportDestination, VideoExportResult } from './video-export-destination';
import { createVideoOutputSession, VideoOutputFinalizationError } from './video-output';

const mocks = vi.hoisted(() => ({
    outputOptions: vi.fn(),
    addVideoTrack: vi.fn(),
    addAudioTrack: vi.fn(),
    start: vi.fn(),
    finalize: vi.fn(),
    cancel: vi.fn(),
    forceClose: vi.fn(),
    createAudio: vi.fn(),
    destinationFactory: vi.fn(),
    mp4Options: vi.fn(),
    webmOptions: vi.fn(),
}));

vi.mock('mediabunny', () => ({
    Output: class {
        state = 'pending';
        addVideoTrack = mocks.addVideoTrack;
        addAudioTrack = mocks.addAudioTrack;
        constructor(options: unknown) {
            mocks.outputOptions(options);
        }
        async start() {
            await mocks.start();
            this.state = 'started';
        }
        async finalize() {
            this.state = 'finalizing';
            await mocks.finalize();
            this.state = 'finalized';
        }
        async cancel() {
            await mocks.cancel();
            this.state = 'canceled';
        }
    },
    Mp4OutputFormat: class {
        constructor(options: unknown) {
            mocks.mp4Options(options);
        }
    },
    WebMOutputFormat: class {
        constructor(options: unknown) {
            mocks.webmOptions(options);
        }
    },
}));

vi.mock('./video-export-audio', () => ({ createVideoExportAudio: mocks.createAudio }));
vi.mock('./video-export-source-cleanup', () => ({ forceCloseVideoExportSource: mocks.forceClose }));
vi.mock('./video-export-destination', async importOriginal => ({
    ...(await importOriginal<typeof import('./video-export-destination')>()),
    createVideoExportDestination: mocks.destinationFactory,
}));

const options: VideoEncodingOptions = { format: 'mp4', fps: 30, quality: 95, isTransparent: false };
const source = {} as VideoSource;
let destination: VideoExportDestination;
let audio: VideoExportAudio;
let result: VideoExportResult;

beforeEach(() => {
    vi.resetAllMocks();
    result = { kind: 'memory-blob', blob: new Blob(['video'], { type: 'video/mp4' }) };
    destination = {
        target: {} as Target,
        complete: vi.fn(async () => result),
        dispose: vi.fn(async () => undefined),
    };
    audio = {
        source: {} as AudioSource,
        addUntil: vi.fn(async () => undefined),
        complete: vi.fn(async () => undefined),
        dispose: vi.fn(async () => undefined),
    };
    mocks.destinationFactory.mockResolvedValue(destination);
    mocks.createAudio.mockResolvedValue(audio);
    mocks.start.mockResolvedValue(undefined);
    mocks.finalize.mockResolvedValue(undefined);
    mocks.cancel.mockResolvedValue(undefined);
    mocks.forceClose.mockResolvedValue(undefined);
});

afterEach(() => vi.useRealTimers());

describe('unified video output session', () => {
    it('registers video and incremental audio in the same disk target and disables MP4 in-memory fast start', async () => {
        const tracks = [{ blob: new Blob(['audio']), start: 0.5, end: 2 }];
        const session = await createVideoOutputSession(source, { ...options, audioTracks: tracks });
        expect(mocks.outputOptions).toHaveBeenCalledExactlyOnceWith({
            format: expect.anything(),
            target: destination.target,
        });
        expect(mocks.mp4Options).toHaveBeenCalledExactlyOnceWith({ fastStart: false });
        expect(mocks.addVideoTrack).toHaveBeenCalledExactlyOnceWith(source, { frameRate: 30 });
        expect(mocks.addAudioTrack).toHaveBeenCalledExactlyOnceWith(audio.source);
        expect(mocks.createAudio).toHaveBeenCalledExactlyOnceWith(tracks, 'mp4', undefined);
        expect(audio.addUntil).not.toHaveBeenCalled();
        expect(audio.complete).not.toHaveBeenCalled();
        await session.addAudioUntil(1 / 30);
        await session.addAudioUntil(2 / 30);
        expect(vi.mocked(audio.addUntil).mock.calls).toEqual([[1 / 30], [2 / 30]]);
        expect(await session.complete(2)).toBe(result);
        expect(audio.complete).toHaveBeenCalledExactlyOnceWith(2);
        expect(mocks.finalize).toHaveBeenCalledOnce();
        expect(destination.complete).toHaveBeenCalledExactlyOnceWith('video/mp4');
        await session.dispose();
        expect(mocks.cancel).not.toHaveBeenCalled();
        expect(audio.dispose).toHaveBeenCalledOnce();
        expect(destination.dispose).toHaveBeenCalledOnce();
        expect(mocks.forceClose).not.toHaveBeenCalled();
    });

    it('supports silent WebM and its explicitly prepared destination factory', async () => {
        mocks.createAudio.mockResolvedValueOnce(undefined);
        const factory = vi.fn(async () => destination);
        const session = await createVideoOutputSession(source, {
            ...options,
            format: 'webm',
            destinationFactory: factory,
        });
        expect(factory).toHaveBeenCalledOnce();
        expect(createVideoExportDestination).not.toHaveBeenCalled();
        expect(mocks.webmOptions).toHaveBeenCalledOnce();
        expect(mocks.mp4Options).not.toHaveBeenCalled();
        expect(mocks.addAudioTrack).not.toHaveBeenCalled();
        await session.addAudioUntil(1);
        await session.complete(1);
        expect(destination.complete).toHaveBeenCalledExactlyOnceWith('video/webm');
        await session.dispose();
    });

    it('does not acquire output or audio resources if the destination cannot open', async () => {
        const error = new VideoExportStorageError('Disk is full');
        mocks.destinationFactory.mockRejectedValueOnce(error);
        await expect(createVideoOutputSession(source, options)).rejects.toBe(error);
        expect(mocks.createAudio).not.toHaveBeenCalled();
        expect(mocks.outputOptions).not.toHaveBeenCalled();
    });

    it('aborts the uncommitted destination if audio initialization fails', async () => {
        const error = new Error('Audio decoder is unavailable');
        mocks.createAudio.mockRejectedValueOnce(error);
        await expect(createVideoOutputSession(source, options)).rejects.toBe(error);
        expect(destination.dispose).toHaveBeenCalledOnce();
        expect(destination.complete).not.toHaveBeenCalled();
        expect(mocks.outputOptions).not.toHaveBeenCalled();
    });

    it('cleans both tracks and the destination when container startup fails', async () => {
        const error = new Error('Container startup failed');
        mocks.start.mockRejectedValueOnce(error);
        await expect(createVideoOutputSession(source, options)).rejects.toBe(error);
        expect(mocks.cancel).toHaveBeenCalledOnce();
        expect(audio.dispose).toHaveBeenCalledOnce();
        expect(destination.dispose).toHaveBeenCalledOnce();
    });

    it('interrupts container startup on cancellation and releases the acquired resources', async () => {
        const controller = new AbortController();
        const reason = new DOMException('Canceled', 'AbortError');
        mocks.start.mockImplementationOnce(() => new Promise(() => {}));
        const creating = createVideoOutputSession(source, { ...options, signal: controller.signal });
        const assertion = expect(creating).rejects.toBe(reason);
        await vi.waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
        controller.abort(reason);
        await assertion;
        expect(mocks.forceClose).toHaveBeenCalledWith(source);
        expect(mocks.cancel).toHaveBeenCalledOnce();
        expect(audio.dispose).toHaveBeenCalledOnce();
        expect(destination.dispose).toHaveBeenCalledOnce();
    });

    it('preserves an audio runtime failure without classifying it as a video encoding failure', async () => {
        const error = new Error('Audio read failed');
        vi.mocked(audio.addUntil).mockRejectedValueOnce(error);
        const session = await createVideoOutputSession(source, options);
        await expect(session.addAudioUntil(1)).rejects.toBe(error);
        await session.dispose();
        expect(mocks.cancel).toHaveBeenCalledOnce();
        expect(destination.complete).not.toHaveBeenCalled();
    });

    it('does not finalize or commit if completing the audio stream fails', async () => {
        const error = new Error('Audio encoder failed');
        vi.mocked(audio.complete).mockRejectedValueOnce(error);
        const session = await createVideoOutputSession(source, options);
        await expect(session.complete(1)).rejects.toBe(error);
        expect(mocks.finalize).not.toHaveBeenCalled();
        expect(destination.complete).not.toHaveBeenCalled();
        await session.dispose();
    });

    it('marks a container finalization error with its original cause', async () => {
        const error = new Error('Video encoder flush failed');
        mocks.finalize.mockRejectedValueOnce(error);
        const session = await createVideoOutputSession(source, options);
        await expect(session.complete(1)).rejects.toMatchObject({
            constructor: VideoOutputFinalizationError,
            cause: error,
        });
        expect(destination.complete).not.toHaveBeenCalled();
        await session.dispose();
        expect(mocks.cancel).toHaveBeenCalledOnce();
    });

    it('keeps storage failures outside the retryable finalization error class', async () => {
        const error = new VideoExportStorageError('Video exceeds the memory output limit');
        mocks.finalize.mockRejectedValueOnce(error);
        const session = await createVideoOutputSession(source, options);
        await expect(session.complete(1)).rejects.toBe(error);
        await session.dispose();
        expect(destination.complete).not.toHaveBeenCalled();
    });

    it('preserves a failed disk commit and releases its destination', async () => {
        const error = new VideoExportStorageError('Disk commit failed');
        vi.mocked(destination.complete).mockRejectedValueOnce(error);
        const session = await createVideoOutputSession(source, options);
        await expect(session.complete(1)).rejects.toBe(error);
        await session.dispose();
        expect(destination.dispose).toHaveBeenCalledOnce();
    });

    it('does not start a canceled export', async () => {
        const controller = new AbortController();
        controller.abort();
        await expect(createVideoOutputSession(source, { ...options, signal: controller.signal })).rejects.toBe(
            controller.signal.reason
        );
        expect(createVideoExportDestination).not.toHaveBeenCalled();
    });

    it('releases an acquired destination when cancellation arrives during audio setup', async () => {
        const controller = new AbortController();
        const reason = new DOMException('Canceled', 'AbortError');
        mocks.createAudio.mockImplementationOnce(async () => {
            controller.abort(reason);
            return audio;
        });
        await expect(createVideoOutputSession(source, { ...options, signal: controller.signal })).rejects.toBe(reason);
        expect(audio.dispose).toHaveBeenCalledOnce();
        expect(destination.dispose).toHaveBeenCalledOnce();
        expect(mocks.outputOptions).not.toHaveBeenCalled();
    });

    it('stops finalization waiting on cancellation and never commits the partial file', async () => {
        const controller = new AbortController();
        const reason = new DOMException('Canceled', 'AbortError');
        mocks.finalize.mockImplementationOnce(() => new Promise(() => {}));
        const session = await createVideoOutputSession(source, { ...options, signal: controller.signal });
        const complete = session.complete(1);
        await vi.waitFor(() => expect(mocks.finalize).toHaveBeenCalledOnce());
        const assertion = expect(complete).rejects.toBe(reason);
        controller.abort(reason);
        await assertion;
        await session.dispose();
        expect(destination.complete).not.toHaveBeenCalled();
        expect(destination.dispose).toHaveBeenCalledOnce();
    });

    it('checks cancellation again after finalization and before committing the file', async () => {
        const controller = new AbortController();
        const reason = new DOMException('Canceled', 'AbortError');
        mocks.finalize.mockImplementationOnce(async () => controller.abort(reason));
        const session = await createVideoOutputSession(source, { ...options, signal: controller.signal });
        await expect(session.complete(1)).rejects.toBe(reason);
        expect(destination.complete).not.toHaveBeenCalled();
        await session.dispose();
    });

    it('releases resources only once even if disposal is requested concurrently', async () => {
        const session = await createVideoOutputSession(source, options);
        await Promise.all([session.dispose(), session.dispose()]);
        await session.dispose();
        expect(mocks.cancel).toHaveBeenCalledOnce();
        expect(audio.dispose).toHaveBeenCalledOnce();
        expect(destination.dispose).toHaveBeenCalledOnce();
    });

    it('force-closes codec resources before awaiting container cancellation', async () => {
        const session = await createVideoOutputSession(source, options);
        await session.dispose();
        expect(mocks.forceClose).toHaveBeenCalledWith(source);
        expect(mocks.forceClose.mock.invocationCallOrder[0]).toBeLessThan(mocks.cancel.mock.invocationCallOrder[0]);
    });

    it('still releases the destination when disposing audio throws', async () => {
        const error = new Error('Audio close failed');
        vi.mocked(audio.dispose).mockRejectedValueOnce(error);
        const session = await createVideoOutputSession(source, options);
        await expect(session.dispose()).rejects.toBe(error);
        expect(destination.dispose).toHaveBeenCalledOnce();
    });

    it('leaves a successful temporary file available to the download consumer', async () => {
        const remove = vi.fn(async () => undefined);
        result = { kind: 'temporary-file', file: new File(['video'], 'video.mp4'), dispose: remove };
        const session = await createVideoOutputSession(source, options);
        expect(await session.complete(1)).toBe(result);
        await session.dispose();
        expect(mocks.cancel).not.toHaveBeenCalled();
        expect(destination.dispose).toHaveBeenCalledOnce();
        expect(remove).not.toHaveBeenCalled();
    });
});

describe('export destination setup cancellation', () => {
    it('releases a late destination without initializing audio', async () => {
        const controller = new AbortController();
        let resolve!: (value: VideoExportDestination) => void;
        const pending = new Promise<VideoExportDestination>(done => {
            resolve = done;
        });
        const operation = createVideoOutputSession(source, {
            ...options,
            signal: controller.signal,
            destinationFactory: () => pending,
        });
        controller.abort();
        await expect(operation).rejects.toMatchObject({ name: 'AbortError' });
        resolve(destination);
        await vi.waitFor(() => expect(destination.dispose).toHaveBeenCalledOnce());
        expect(mocks.createAudio).not.toHaveBeenCalled();
    });
    it('releases a destination that resolves in the cancellation microtask', async () => {
        const controller = new AbortController();
        const pending = Promise.resolve(destination);
        void pending.then(() => controller.abort());
        await expect(
            createVideoOutputSession(source, {
                ...options,
                signal: controller.signal,
                destinationFactory: () => pending,
            })
        ).rejects.toMatchObject({ name: 'AbortError' });
        expect(destination.dispose).toHaveBeenCalledOnce();
        expect(mocks.createAudio).not.toHaveBeenCalled();
    });
});
