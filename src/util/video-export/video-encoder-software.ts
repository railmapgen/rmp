import type { FFmpeg } from '@ffmpeg/ffmpeg';
import type { Input } from 'mediabunny';
import type { VideoEncodingOptions, VideoFrameWriter } from './video-encoder';
import { execVideoFFmpeg, loadVideoFFmpeg } from './video-audio-mux';
import { createVideoOutputSession } from './video-output';
import { waitForVideoExportOperation } from './video-export-control';

const MaxBatchBytes = 32 * 1024 * 1024;
const MaxBatchFrames = 30;
// Deleting files releases MEMFS buffers; replacing the worker also releases the grown WASM heap.
const MaxWorkerBatches = 64;

const getAvcLevel = (width: number, height: number, fps: number) => {
    const blocks = Math.ceil(width / 16) * Math.ceil(height / 16);
    return [
        [3.1, 3600, 108000],
        [3.2, 5120, 216000],
        [4, 8192, 245760],
        [4.2, 8704, 522240],
        [5, 22080, 589824],
        [5.1, 36864, 983040],
        [5.2, 36864, 2073600],
    ].find(([, maxBlocks, maxBlocksPerSecond]) => blocks <= maxBlocks && blocks * fps <= maxBlocksPerSecond)?.[0];
};

const copyDecoderConfig = (config: VideoDecoderConfig): VideoDecoderConfig => {
    const description = config.description;
    // A demuxer's description may be a view into its entire input segment. Keep only the codec header.
    return {
        ...config,
        ...(description && {
            description: (ArrayBuffer.isView(description)
                ? new Uint8Array(description.buffer, description.byteOffset, description.byteLength)
                : new Uint8Array(description)
            ).slice(),
        }),
    };
};

const decoderConfigKey = (config: VideoDecoderConfig) =>
    JSON.stringify({
        ...config,
        description: config.description ? Array.from(config.description as Uint8Array) : undefined,
    });

export const createSoftwareVideoFrameWriter = async (
    canvas: HTMLCanvasElement,
    options: VideoEncodingOptions
): Promise<VideoFrameWriter> => {
    const { BufferSource, EncodedPacketSink, EncodedVideoPacketSource, Input, MP4, WEBM } = await import('mediabunny');
    const source = new EncodedVideoPacketSource(options.format === 'mp4' ? 'avc' : 'vp8');
    const lifetime = new AbortController();
    let ffmpeg: FFmpeg | undefined;
    let input: Input | undefined;
    let session: Awaited<ReturnType<typeof createVideoOutputSession>> | undefined;
    let setupComplete = false;
    let disposed = false;
    let completed = false;
    let sourceClosed = false;
    let disposal: Promise<void> | undefined;
    const terminateWorker = () => {
        const worker = ffmpeg;
        ffmpeg = undefined;
        worker?.terminate();
    };
    const closeSource = () => {
        if (sourceClosed || !session) return;
        sourceClosed = true;
        source.close();
    };
    const throwIfUnavailable = () => {
        if (lifetime.signal.aborted)
            throw lifetime.signal.reason ?? new DOMException('Video export cancelled', 'AbortError');
        if (disposed) throw new DOMException('Video encoder disposed', 'AbortError');
        if (completed) throw new Error('Video encoding is already complete');
    };
    const dispose = () => {
        if (disposal) return disposal;
        disposed = true;
        options.signal?.removeEventListener('abort', onAbort);
        lifetime.abort(new DOMException('Video encoder disposed', 'AbortError'));
        input?.dispose();
        input = undefined;
        terminateWorker();
        closeSource();
        disposal = session?.dispose() ?? Promise.resolve();
        return disposal;
    };
    const onAbort = () => {
        lifetime.abort(options.signal?.reason ?? new DOMException('Video export cancelled', 'AbortError'));
        terminateWorker();
        if (setupComplete) void dispose().catch(() => undefined);
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });
    if (options.signal?.aborted) onAbort();
    const getWorker = async () => {
        throwIfUnavailable();
        if (!ffmpeg) ffmpeg = await loadVideoFFmpeg(lifetime.signal);
        throwIfUnavailable();
        return ffmpeg;
    };
    try {
        throwIfUnavailable();
        session = await createVideoOutputSession(source, options);
        await getWorker();
        setupComplete = true;
    } catch (error) {
        await dispose();
        throw error;
    }
    const activeSession = session;
    const frameNames: string[] = [];
    const batchSize = Math.max(
        1,
        Math.min(MaxBatchFrames, Math.floor(MaxBatchBytes / (canvas.width * canvas.height * 4)))
    );
    let batchBytes = 0;
    let submittedFrames = 0;
    let emittedFrames = 0;
    let workerBatches = 0;
    let stableConfig: VideoDecoderConfig | undefined;
    let stableConfigKey: string | undefined;
    const quality = Math.max(1, Math.min(100, options.quality));
    const crf = Math.round(options.format === 'mp4' ? 40 - quality * 0.24 : 55 - quality * 0.35);
    const bitrate = Math.max(
        250_000,
        Math.round(canvas.width * canvas.height * options.fps * (0.04 + quality * 0.0016))
    );
    const level = getAvcLevel(canvas.width, canvas.height, options.fps);

    const flushBatch = async () => {
        if (!frameNames.length) return;
        const worker = await getWorker();
        const batchFrames = frameNames.length;
        const name = `segment.${options.format}`;
        try {
            await execVideoFFmpeg(worker, [
                '-framerate',
                String(options.fps),
                '-i',
                'frame-%06d.png',
                '-an',
                ...(options.format === 'mp4'
                    ? [
                          '-c:v',
                          'libx264',
                          '-preset',
                          'veryfast',
                          '-profile:v',
                          'baseline',
                          ...(level ? ['-level:v', String(level)] : []),
                          '-bf',
                          '0',
                          '-pix_fmt',
                          'yuv420p',
                      ]
                    : [
                          '-c:v',
                          // The bundled single-thread core's VP9 encoder can trap on multi-frame input; VP8 is stable.
                          'libvpx',
                          '-deadline',
                          'realtime',
                          '-cpu-used',
                          '4',
                          '-b:v',
                          String(bitrate),
                          '-auto-alt-ref',
                          '0',
                          '-pix_fmt',
                          options.isTransparent ? 'yuva420p' : 'yuv420p',
                      ]),
                '-crf',
                String(crf),
                '-threads',
                '1',
                '-frames:v',
                String(batchFrames),
                name,
            ]);
            throwIfUnavailable();
            // The encoder has consumed these images; do not retain PNGs while the output applies backpressure.
            await Promise.all(frameNames.map(frameName => worker.deleteFile(frameName)));
            const data = await worker.readFile(name);
            if (typeof data === 'string' || !data.byteLength) throw new Error('Video encoder returned no output');
            // Remove the WASM copy as soon as the current segment has been transferred to JavaScript.
            await worker.deleteFile(name);
            input = new Input({ formats: [options.format === 'mp4' ? MP4 : WEBM], source: new BufferSource(data) });
            const track = await input.getPrimaryVideoTrack();
            if (!track) throw new Error('Video encoder returned no video track');
            const config = await track.getDecoderConfig();
            if (!config) throw new Error('Video encoder returned no decoder configuration');
            const nextConfig = copyDecoderConfig(config);
            const nextConfigKey = decoderConfigKey(nextConfig);
            if (stableConfigKey !== undefined && stableConfigKey !== nextConfigKey)
                throw new Error('Video encoder changed its decoder configuration between batches');
            stableConfig ??= nextConfig;
            stableConfigKey = nextConfigKey;
            let packetIndex = 0;
            const sink = new EncodedPacketSink(track);
            for await (const packet of sink.packets()) {
                throwIfUnavailable();
                if (packetIndex >= batchFrames) throw new Error('Video encoder returned too many frames');
                if (packetIndex === 0 && packet.type !== 'key')
                    throw new Error('Video encoder batch must begin with a key frame');
                // B-frames and VP8 alternate references are disabled, so decode order is the PNG frame order.
                // Derive both boundaries from the absolute frame clock, avoiding WebM millisecond rounding drift.
                const frame = emittedFrames + packetIndex;
                const timestamp = frame / options.fps;
                const end = (frame + 1) / options.fps;
                await activeSession.addAudioUntil(timestamp);
                await source.add(
                    packet.clone({ timestamp, duration: end - timestamp, sequenceNumber: frame }),
                    packetIndex === 0 ? { decoderConfig: stableConfig } : undefined
                );
                await activeSession.addAudioUntil(end);
                packetIndex++;
            }
            if (packetIndex !== batchFrames) throw new Error('Video encoder returned an incomplete batch');
            emittedFrames += packetIndex;
            workerBatches++;
        } catch (error) {
            throwIfUnavailable();
            throw error;
        } finally {
            input?.dispose();
            input = undefined;
            await Promise.allSettled([...frameNames, name].map(frameName => worker.deleteFile(frameName)));
            frameNames.length = 0;
            batchBytes = 0;
        }
        if (workerBatches >= MaxWorkerBatches) {
            terminateWorker();
            workerBatches = 0;
        }
    };

    return {
        async addFrame() {
            throwIfUnavailable();
            const worker = await getWorker();
            // PNG encoding is supported on Safari and preserves alpha for transparent WebM.
            const blob = await waitForVideoExportOperation(
                new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob(
                        value => (value ? resolve(value) : reject(new Error('Could not encode video frame'))),
                        'image/png'
                    );
                }),
                lifetime.signal
            );
            throwIfUnavailable();
            const name = `frame-${String(frameNames.length).padStart(6, '0')}.png`;
            // Track the name before uploading so partial writes are also cleaned up after an error.
            frameNames.push(name);
            await worker.writeFile(name, new Uint8Array(await blob.arrayBuffer()));
            throwIfUnavailable();
            submittedFrames++;
            batchBytes += blob.size;
            if (frameNames.length >= batchSize || batchBytes >= MaxBatchBytes) await flushBatch();
        },
        async complete() {
            throwIfUnavailable();
            await flushBatch();
            if (!submittedFrames) throw new Error('No video frames to encode');
            closeSource();
            const result = await activeSession.complete(submittedFrames / options.fps);
            completed = true;
            return result;
        },
        dispose,
    };
};
