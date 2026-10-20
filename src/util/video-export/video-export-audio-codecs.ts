import { AudioSampleSource, EncodedAudioPacketSource, EncodedPacket, canEncodeAudio } from 'mediabunny';
import type { AudioSample, AudioSource } from 'mediabunny';
import type LibAvTypes from '@libav.js/variant-default';
import opusWorkerURL from '../../../node_modules/@libav.js/variant-default/dist/libav-6.10.9.0-default.wasm.mjs?url';
import opusWasmURL from '../../../node_modules/@libav.js/variant-default/dist/libav-6.10.9.0-default.wasm.wasm?url';
import { throwIfVideoExportAborted, waitForVideoExportOperation } from './video-export-control';
import { forceCloseVideoExportSource } from './video-export-source-cleanup';

interface ExportAudioEncoder {
    source: AudioSource;
    add(sample: AudioSample): Promise<void>;
    complete(): Promise<void>;
    dispose(): Promise<void>;
}

/** The narrow source/custom-AAC contract is tied to the pinned Mediabunny and AAC extension 1.56.1. */
interface ClosableAudioExportSource {
    _closingPromise: Promise<void> | null;
    _flushAndClose(forceClose: boolean): Promise<void> | void;
    _encoder?: {
        customEncoder?: {
            close(): Promise<void> | void;
            pendingMessages?: Map<number, { reject(reason?: unknown): void }>;
        } | null;
    };
}

const initializeSoftwareOpus = async (signal?: AbortSignal) => {
    let instance: LibAvTypes.LibAV | undefined;
    let abandoned = false;
    let failure: unknown;
    const check = () => {
        throwIfVideoExportAborted(signal);
        if (abandoned) throw failure;
    };
    const terminate = () => instance?.terminate();
    signal?.addEventListener('abort', terminate, { once: true });
    // One deadline covers module loading, worker startup, encoder initialization, and every header RPC.
    const initializing = (async () => {
        check();
        const { default: wrapper } = await import('@libav.js/variant-default');
        check();
        const loading = wrapper.LibAV({ toImport: opusWorkerURL, wasmurl: opusWasmURL });
        void loading.then(
            late => {
                if (abandoned || signal?.aborted) late.terminate();
            },
            () => undefined
        );
        instance = await loading;
        check();
        const libav = instance;
        const [, context, frame, packet] = await libav.ff_init_encoder('libopus', {
            ctx: {
                sample_fmt: libav.AV_SAMPLE_FMT_FLT,
                sample_rate: 48_000,
                channels: 2,
                channel_layout: 3,
                bit_rate: 128_000,
            },
            time_base: [1, 48_000],
            options: { frame_duration: '20' },
        });
        check();
        const pointer = await libav.AVCodecContext_extradata(context);
        check();
        const size = await libav.AVCodecContext_extradata_size(context);
        check();
        const description = await libav.copyout_u8(pointer, size);
        check();
        return { libav, context, frame, packet, description, terminate };
    })();
    try {
        return await waitForVideoExportOperation(initializing, signal);
    } catch (error) {
        abandoned = true;
        failure = error;
        signal?.removeEventListener('abort', terminate);
        terminate();
        throw error;
    }
};

/** One persistent libopus context, not a collection of independently encoded audio segments. */
const createSoftwareOpusEncoder = async (signal?: AbortSignal): Promise<ExportAudioEncoder> => {
    throwIfVideoExportAborted(signal);
    const { libav, context, frame, packet, description, terminate } = await initializeSoftwareOpus(signal);
    let done = false;
    let disposed = false;
    try {
        const source = new EncodedAudioPacketSource('opus');
        let metadata: EncodedAudioChunkMetadata | undefined = {
            decoderConfig: { codec: 'opus', sampleRate: 48_000, numberOfChannels: 2, description },
        };
        const writePackets = async (packets: LibAvTypes.Packet[]) => {
            for (const encoded of packets) {
                const pts = libav.i64tof64(encoded.pts ?? 0, encoded.ptshi ?? 0);
                const duration = libav.i64tof64(encoded.duration ?? 960, encoded.durationhi ?? 0);
                // Preserve encoder priming timestamps and OpusHead pre-skip; never reset them per PCM block.
                await waitForVideoExportOperation(
                    source.add(new EncodedPacket(encoded.data, 'key', pts / 48_000, duration / 48_000), metadata),
                    signal
                );
                metadata = undefined;
            }
        };
        return {
            source,
            async add(sample) {
                if (done || disposed) throw new Error('Software audio encoder is closed');
                const data = new Float32Array(sample.numberOfFrames * 2);
                sample.copyTo(data, { planeIndex: 0, format: 'f32' });
                const [pts, ptshi] = libav.f64toi64(Math.round(sample.timestamp * 48_000));
                await writePackets(
                    await waitForVideoExportOperation(
                        libav.ff_encode_multi(context, frame, packet, [
                            {
                                data,
                                format: libav.AV_SAMPLE_FMT_FLT,
                                sample_rate: 48_000,
                                channel_layout: 3,
                                channels: 2,
                                nb_samples: sample.numberOfFrames,
                                pts,
                                ptshi,
                                time_base_num: 1,
                                time_base_den: 48_000,
                            },
                        ]),
                        signal
                    )
                );
            },
            async complete() {
                if (done || disposed) return;
                await writePackets(
                    await waitForVideoExportOperation(libav.ff_encode_multi(context, frame, packet, [], true), signal)
                );
                source.close();
                const closing = (source as unknown as ClosableAudioExportSource)._closingPromise;
                if (closing) await waitForVideoExportOperation(closing, signal);
                done = true;
            },
            async dispose() {
                if (disposed) return;
                disposed = true;
                signal?.removeEventListener('abort', terminate);
                try {
                    if (!signal?.aborted) await libav.ff_free_encoder(context, frame, packet);
                } finally {
                    if (!done) await forceCloseVideoExportSource(source).catch(() => undefined);
                    libav.terminate();
                }
            },
        };
    } catch (error) {
        signal?.removeEventListener('abort', terminate);
        libav.terminate();
        throw error;
    }
};

export const createExportAudioEncoder = async (
    format: 'mp4' | 'webm',
    signal?: AbortSignal
): Promise<ExportAudioEncoder> => {
    throwIfVideoExportAborted(signal);
    const codec = format === 'mp4' ? 'aac' : 'opus';
    const config = { sampleRate: 48_000, numberOfChannels: 2, bitrate: 128_000 };
    if (!(await waitForVideoExportOperation(canEncodeAudio(codec, config), signal))) {
        if (codec === 'opus') return createSoftwareOpusEncoder(signal);
        const { registerAacEncoder } = await waitForVideoExportOperation(import('@mediabunny/aac-encoder'), signal);
        throwIfVideoExportAborted(signal);
        registerAacEncoder();
    }
    const source = new AudioSampleSource({ codec, bitrate: 128_000 });
    const adapted = source as unknown as ClosableAudioExportSource;
    const flushAndClose = adapted._flushAndClose.bind(source);
    // The library queues custom close behind flush, while the AAC extension's close only terminates its worker.
    // Bypass that queue on cancellation and reject pending worker commands to let the serialized flush unwind.
    adapted._flushAndClose = forceClose => {
        if (forceClose) {
            const custom = adapted._encoder?.customEncoder;
            if (custom) {
                void Promise.resolve(custom.close()).catch(() => undefined);
                const reason = signal?.reason ?? new DOMException('Audio encoder closed', 'AbortError');
                for (const command of custom.pendingMessages?.values() ?? []) command.reject(reason);
                custom.pendingMessages?.clear();
            }
        }
        return flushAndClose(forceClose);
    };
    let completed = false;
    let disposed = false;
    const onAbort = () => {
        void forceCloseVideoExportSource(source).catch(() => undefined);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    return {
        source,
        async add(sample) {
            throwIfVideoExportAborted(signal);
            try {
                await waitForVideoExportOperation(source.add(sample), signal);
            } catch (error) {
                await forceCloseVideoExportSource(source).catch(() => undefined);
                throw error;
            }
        },
        async complete() {
            if (completed) return;
            throwIfVideoExportAborted(signal);
            source.close();
            if (!adapted._closingPromise)
                throw new Error('Mediabunny 1.56.1 audio source closing contract is unavailable');
            try {
                // close() returns void: await its actual flush here so audio errors never become video retries.
                await waitForVideoExportOperation(adapted._closingPromise, signal);
                completed = true;
                signal?.removeEventListener('abort', onAbort);
            } catch (error) {
                await forceCloseVideoExportSource(source).catch(() => undefined);
                throw error;
            }
        },
        async dispose() {
            if (disposed) return;
            disposed = true;
            signal?.removeEventListener('abort', onAbort);
            if (!completed) await forceCloseVideoExportSource(source);
        },
    };
};
