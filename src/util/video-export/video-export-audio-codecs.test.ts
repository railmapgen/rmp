import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    AudioSample,
    BufferSource,
    BufferTarget,
    EncodedPacketSink,
    Input,
    MP4,
    Mp4OutputFormat,
    Output,
    WEBM,
    WebMOutputFormat,
} from 'mediabunny';
import type { VideoSource } from 'mediabunny';
import { createExportAudioEncoder } from './video-export-audio-codecs';
import { forceCloseVideoExportSource } from './video-export-source-cleanup';
import { createVideoOutputSession } from './video-output';

const codecMocks = vi.hoisted(() => ({
    nativeSupport: undefined as boolean | undefined,
    libavFactory: undefined as (() => Promise<unknown>) | undefined,
}));
vi.mock('mediabunny', async importOriginal => {
    const original = await importOriginal<typeof import('mediabunny')>();
    return {
        ...original,
        canEncodeAudio: async (...args: Parameters<typeof original.canEncodeAudio>) =>
            codecMocks.nativeSupport ?? original.canEncodeAudio(...args),
    };
});
vi.mock('@libav.js/variant-default', async importOriginal => {
    const original = await importOriginal<{ default: typeof import('@libav.js/variant-default') }>();
    return {
        ...original,
        default: {
            ...original.default,
            LibAV: (...args: Parameters<typeof original.default.LibAV>) =>
                codecMocks.libavFactory ? codecMocks.libavFactory() : original.default.LibAV(...args),
        },
    };
});
afterEach(() => {
    codecMocks.nativeSupport = undefined;
    codecMocks.libavFactory = undefined;
    vi.useRealTimers();
});

const createControlledLibav = () => ({
    AV_SAMPLE_FMT_FLT: 3,
    ff_init_encoder: vi.fn(async () => [0, 1, 2, 3, 960]),
    AVCodecContext_extradata: vi.fn(async () => 8),
    AVCodecContext_extradata_size: vi.fn(async () => 19),
    copyout_u8: vi.fn(async () => new Uint8Array(19)),
    terminate: vi.fn(),
});

const InitializationStages = [
    'LibAV',
    'ff_init_encoder',
    'AVCodecContext_extradata',
    'AVCodecContext_extradata_size',
    'copyout_u8',
] as const;

const createControlledAudioEncoder = async (signal?: AbortSignal) => {
    codecMocks.nativeSupport = true;
    const encoder = await createExportAudioEncoder('webm', signal);
    const output = new Output({ target: new BufferTarget(), format: new WebMOutputFormat() });
    output.addAudioTrack(encoder.source);
    await output.start();
    const wrapper = (
        encoder.source as unknown as {
            _encoder: { encoder: unknown; customEncoder: unknown };
        }
    )._encoder;
    return { encoder, output, wrapper };
};

// The production URLs are Vite assets; Node loads the same unmodified WASM/worker files from disk.
vi.mock('../../../node_modules/@libav.js/variant-default/dist/libav-6.10.9.0-default.wasm.mjs?url', () => ({
    default: `${process.cwd()}/node_modules/@libav.js/variant-default/dist/libav-6.10.9.0-default.wasm.mjs`,
}));
vi.mock('../../../node_modules/@libav.js/variant-default/dist/libav-6.10.9.0-default.wasm.wasm?url', () => ({
    default: `${process.cwd()}/node_modules/@libav.js/variant-default/dist/libav-6.10.9.0-default.wasm.wasm`,
}));

describe('export audio codec fallback', () => {
    it('rejects an already aborted Opus setup before starting a worker', async () => {
        const factory = vi.fn(async () => createControlledLibav());
        codecMocks.libavFactory = factory;
        codecMocks.nativeSupport = false;
        const controller = new AbortController();
        const reason = new Error('Already cancelled');
        controller.abort(reason);
        await expect(createExportAudioEncoder('webm', controller.signal)).rejects.toBe(reason);
        expect(factory).not.toHaveBeenCalled();
    });

    it.each(InitializationStages)('cancels a pending %s initialization and terminates a late worker', async stage => {
        codecMocks.nativeSupport = false;
        const libav = createControlledLibav();
        let resolveWorker!: (value: unknown) => void;
        const factory = vi.fn(() =>
            stage === 'LibAV'
                ? new Promise<unknown>(resolve => {
                      resolveWorker = resolve;
                  })
                : Promise.resolve(libav)
        );
        codecMocks.libavFactory = factory;
        if (stage !== 'LibAV') libav[stage].mockImplementation(() => new Promise<never>(() => {}));
        const controller = new AbortController();
        const reason = new Error(`Cancelled during ${stage}`);
        const creating = createExportAudioEncoder('webm', controller.signal);
        const rejected = expect(creating).rejects.toBe(reason);
        await vi.waitFor(() => expect(stage === 'LibAV' ? factory : libav[stage]).toHaveBeenCalledOnce());
        controller.abort(reason);
        await rejected;
        if (stage === 'LibAV') {
            expect(libav.terminate).not.toHaveBeenCalled();
            resolveWorker(libav);
            await vi.waitFor(() => expect(libav.terminate).toHaveBeenCalledOnce());
            expect(libav.ff_init_encoder).not.toHaveBeenCalled();
        } else {
            expect(libav.terminate).toHaveBeenCalled();
        }
    });

    it.each(InitializationStages)('times out a pending %s initialization and terminates its worker', async stage => {
        vi.useFakeTimers();
        codecMocks.nativeSupport = false;
        const libav = createControlledLibav();
        let resolveWorker!: (value: unknown) => void;
        const factory = vi.fn(() =>
            stage === 'LibAV'
                ? new Promise<unknown>(resolve => {
                      resolveWorker = resolve;
                  })
                : Promise.resolve(libav)
        );
        codecMocks.libavFactory = factory;
        if (stage !== 'LibAV') libav[stage].mockImplementation(() => new Promise<never>(() => {}));
        const creating = createExportAudioEncoder('webm');
        const rejected = expect(creating).rejects.toThrow('timed out');
        await vi.waitFor(() => expect(stage === 'LibAV' ? factory : libav[stage]).toHaveBeenCalledOnce());
        await vi.advanceTimersByTimeAsync(30_000);
        await rejected;
        if (stage === 'LibAV') {
            resolveWorker(libav);
            await Promise.resolve();
            expect(libav.terminate).toHaveBeenCalledOnce();
            expect(libav.ff_init_encoder).not.toHaveBeenCalled();
        } else {
            expect(libav.terminate).toHaveBeenCalled();
        }
        expect(vi.getTimerCount()).toBe(0);
    });

    it('disposes the destination when cancellation interrupts software audio setup', async () => {
        codecMocks.nativeSupport = false;
        const libav = createControlledLibav();
        libav.ff_init_encoder.mockImplementation(() => new Promise(() => {}));
        codecMocks.libavFactory = async () => libav;
        const controller = new AbortController();
        const destination = {
            target: new BufferTarget(),
            complete: vi.fn(),
            dispose: vi.fn(async () => undefined),
        };
        const creating = createVideoOutputSession({} as VideoSource, {
            format: 'webm',
            fps: 30,
            quality: 90,
            isTransparent: false,
            signal: controller.signal,
            destinationFactory: async () => destination,
            audioTracks: [{ blob: new Blob(['audio']), start: 0, end: 1 }],
        });
        const rejected = expect(creating).rejects.toMatchObject({ name: 'AbortError' });
        await vi.waitFor(() => expect(libav.ff_init_encoder).toHaveBeenCalledOnce());
        controller.abort();
        await rejected;
        expect(libav.terminate).toHaveBeenCalled();
        expect(destination.dispose).toHaveBeenCalledOnce();
        expect(destination.complete).not.toHaveBeenCalled();
    });

    it('reports native flush errors during audio completion without starting another flush on disposal', async () => {
        const { encoder, output, wrapper } = await createControlledAudioEncoder();
        const error = new Error('Audio flush failed');
        const native = {
            state: 'configured',
            flush: vi.fn(async () => {
                throw error;
            }),
            close: vi.fn(() => {
                native.state = 'closed';
            }),
        };
        wrapper.encoder = native;
        await expect(encoder.complete()).rejects.toBe(error);
        expect(native.flush).toHaveBeenCalledOnce();
        expect(native.close).toHaveBeenCalledOnce();
        await encoder.dispose();
        expect(native.flush).toHaveBeenCalledOnce();
        await output.cancel().catch(() => undefined);
    });

    it('interrupts a hanging native flush on abort and preserves the cancellation reason', async () => {
        const controller = new AbortController();
        const { encoder, output, wrapper } = await createControlledAudioEncoder(controller.signal);
        let rejectFlush!: (reason: unknown) => void;
        const native = {
            state: 'configured',
            flush: vi.fn(
                () =>
                    new Promise<void>((_resolve, reject) => {
                        rejectFlush = reject;
                    })
            ),
            close: vi.fn(() => {
                native.state = 'closed';
                rejectFlush(new DOMException('Closed', 'AbortError'));
            }),
        };
        wrapper.encoder = native;
        const reason = new Error('User cancelled audio export');
        const finishing = encoder.complete();
        const rejected = expect(finishing).rejects.toBe(reason);
        await vi.waitFor(() => expect(native.flush).toHaveBeenCalledOnce());
        controller.abort(reason);
        await rejected;
        expect(native.close).toHaveBeenCalledOnce();
        await encoder.dispose();
        await output.cancel().catch(() => undefined);
    });

    it('times out a stalled native audio flush and force-closes its encoder', async () => {
        vi.useFakeTimers();
        const { encoder, output, wrapper } = await createControlledAudioEncoder();
        let rejectFlush!: (reason: unknown) => void;
        const native = {
            state: 'configured',
            flush: vi.fn(
                () =>
                    new Promise<void>((_resolve, reject) => {
                        rejectFlush = reject;
                    })
            ),
            close: vi.fn(() => {
                native.state = 'closed';
                rejectFlush(new DOMException('Closed', 'AbortError'));
            }),
        };
        wrapper.encoder = native;
        const finishing = encoder.complete();
        const rejected = expect(finishing).rejects.toThrow('timed out');
        await vi.advanceTimersByTimeAsync(30_000);
        await rejected;
        expect(native.close).toHaveBeenCalledOnce();
        await encoder.dispose();
        await output.cancel().catch(() => undefined);
    });

    it('lets the session force-close a hung custom AAC worker before audio.dispose is called', async () => {
        const { encoder, output, wrapper } = await createControlledAudioEncoder();
        const pendingMessages = new Map<number, { reject(reason?: unknown): void }>();
        const custom = {
            flush: vi.fn(
                () =>
                    new Promise<void>((_resolve, reject) => {
                        pendingMessages.set(1, { reject });
                    })
            ),
            close: vi.fn(),
            pendingMessages,
        };
        wrapper.customEncoder = custom;
        const finishing = encoder.complete();
        const rejected = expect(finishing).rejects.toMatchObject({ name: 'AbortError' });
        await vi.waitFor(() => expect(custom.flush).toHaveBeenCalledOnce());
        await forceCloseVideoExportSource(encoder.source);
        await rejected;
        expect(custom.close).toHaveBeenCalled();
        expect(pendingMessages.size).toBe(0);
        await encoder.dispose();
        await output.cancel().catch(() => undefined);
    });

    it('does not launch a second asynchronous flush after successful completion', async () => {
        const { encoder, output, wrapper } = await createControlledAudioEncoder();
        const native = {
            state: 'configured',
            flush: vi.fn(async () => undefined),
            close: vi.fn(() => {
                native.state = 'closed';
            }),
        };
        wrapper.encoder = native;
        await encoder.complete();
        await encoder.dispose();
        expect(native.flush).toHaveBeenCalledOnce();
        expect(native.close).toHaveBeenCalledOnce();
        await output.cancel().catch(() => undefined);
    });

    it('loads the persistent AAC WASM encoder when the browser has no AudioEncoder', async () => {
        const encoder = await createExportAudioEncoder('mp4');
        const target = new BufferTarget();
        const output = new Output({ target, format: new Mp4OutputFormat({ fastStart: false }) });
        output.addAudioTrack(encoder.source);
        await output.start();
        try {
            for (let block = 0; block < 4; block++) {
                const sample = new AudioSample({
                    data: new Float32Array(960 * 2),
                    format: 'f32-planar',
                    numberOfChannels: 2,
                    sampleRate: 48_000,
                    timestamp: block * 0.02,
                });
                await encoder.add(sample);
                sample.close();
            }
            await encoder.complete();
            await output.finalize();
            const input = new Input({ source: new BufferSource(target.buffer!), formats: [MP4] });
            try {
                const track = await input.getPrimaryAudioTrack();
                expect(await track!.getCodec()).toBe('aac');
                expect(await track!.getSampleRate()).toBe(48_000);
                expect(await track!.getNumberOfChannels()).toBe(2);
                let count = 0;
                let previous = -Infinity;
                for await (const packet of new EncodedPacketSink(track!).packets()) {
                    expect(packet.timestamp).toBeGreaterThan(previous);
                    previous = packet.timestamp;
                    count++;
                }
                expect(count).toBeGreaterThan(3);
            } finally {
                input.dispose();
            }
        } finally {
            if (output.state !== 'finalized') await output.cancel().catch(() => undefined);
            await encoder.dispose();
        }
    });

    it('encodes consecutive PCM blocks through one real Opus context and muxes their packets without a browser encoder', async () => {
        const encoder = await createExportAudioEncoder('webm');
        const target = new BufferTarget();
        const output = new Output({ target, format: new WebMOutputFormat() });
        output.addAudioTrack(encoder.source);
        await output.start();
        try {
            for (let block = 0; block < 8; block++) {
                const sample = new AudioSample({
                    data: Float32Array.from({ length: 960 * 2 }, (_, i) =>
                        Math.sin((2 * Math.PI * 440 * (block * 960 + (i % 960))) / 48_000)
                    ),
                    format: 'f32-planar',
                    numberOfChannels: 2,
                    sampleRate: 48_000,
                    timestamp: block * 0.02,
                });
                await encoder.add(sample);
                sample.close();
            }
            await encoder.complete();
            await output.finalize();
            const input = new Input({ source: new BufferSource(target.buffer!), formats: [WEBM] });
            try {
                const track = await input.getPrimaryAudioTrack();
                expect(await track!.getCodec()).toBe('opus');
                const packets = [];
                for await (const packet of new EncodedPacketSink(track!).packets()) packets.push(packet);
                expect(packets).toHaveLength(9); // Eight 20 ms packets plus the one encoder-delay tail.
                expect(packets[0].timestamp).toBeLessThanOrEqual(0);
                for (let i = 1; i < packets.length; i++) {
                    expect(packets[i].timestamp - packets[i - 1].timestamp).toBeCloseTo(0.02, 3);
                }
                // WebM timestamps are millisecond ticks; its final SimpleBlock has no individual duration field.
                expect(Math.abs((await input.getDurationFromMetadata())! - 0.16)).toBeLessThanOrEqual(0.00101);
            } finally {
                input.dispose();
            }
        } finally {
            if (output.state !== 'finalized') await output.cancel().catch(() => undefined);
            await encoder.dispose();
        }
    });
});
