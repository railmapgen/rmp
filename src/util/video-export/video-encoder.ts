import type { VideoEncodingConfig } from 'mediabunny';
import { throwIfVideoExportAborted, waitForVideoExportOperation } from './video-export-control';
import { VideoExportDestinationFactory, VideoExportResult, VideoExportStorageError } from './video-export-destination';

export interface VideoEncodingOptions {
    format: 'mp4' | 'webm';
    fps: number;
    quality: number;
    isTransparent: boolean;
    audioTracks?: { blob: Blob; start: number; end: number }[];
    signal?: AbortSignal;
    destinationFactory?: VideoExportDestinationFactory;
}

export interface VideoFrameWriter {
    addFrame: (frame: number) => Promise<void>;
    complete: () => Promise<VideoExportResult>;
    dispose: () => Promise<void>;
}

// Only encoding failures should trigger a retry; SVG/font/map errors should reach the caller.
export class NativeVideoEncodingError extends Error {
    constructor(cause: unknown) {
        super('Browser video encoding failed', { cause });
    }
}

// AVC limits in macroblocks per frame and per second, covering the supported export sizes.
const AvcLevels = [
    [0x1f, 3600, 108000],
    [0x20, 5120, 216000],
    [0x28, 8192, 245760],
    [0x2a, 8704, 522240],
    [0x32, 22080, 589824],
    [0x33, 36864, 983040],
    [0x34, 36864, 2073600],
] as const;

const getAvcBaselineCodec = (width: number, height: number, fps: number) => {
    const blocks = Math.ceil(width / 16) * Math.ceil(height / 16);
    const level = AvcLevels.find(
        ([, maxBlocks, maxBlocksPerSecond]) => blocks <= maxBlocks && blocks * fps <= maxBlocksPerSecond
    );
    return level ? `avc1.4200${level[0].toString(16)}` : undefined;
};

export const createVideoFrameWriter = async (
    canvas: HTMLCanvasElement,
    options: VideoEncodingOptions,
    forceSoftware = false
): Promise<VideoFrameWriter> => {
    throwIfVideoExportAborted(options.signal);
    if (!forceSoftware && typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
        const { VideoSample, VideoSampleSource, canEncodeVideo, Quality } = await import('mediabunny');
        const { probeVideoEncoder } = await import('./video-encoder-probe');
        const codecs = options.format === 'mp4' ? (['avc'] as const) : (['vp9', 'vp8'] as const);
        const quality = new Quality(Math.max(0, Math.min(1, options.quality / 100)));
        let selected: VideoEncodingConfig | undefined;
        // Hardware preferences are hints, not proof of which physical encoder the browser chooses.
        for (const hardwareAcceleration of ['prefer-hardware', 'no-preference', 'prefer-software'] as const) {
            for (const codec of codecs) {
                throwIfVideoExportAborted(options.signal);
                const config: VideoEncodingConfig = {
                    codec,
                    quality,
                    hardwareAcceleration,
                    latencyMode: 'quality',
                    // Retain the existing WebKit-compatible profile, including its size/FPS level.
                    fullCodecString:
                        codec === 'avc' ? getAvcBaselineCodec(canvas.width, canvas.height, options.fps) : undefined,
                    alpha: options.format === 'webm' && options.isTransparent ? 'keep' : 'discard',
                };
                try {
                    if (
                        !(await waitForVideoExportOperation(
                            canEncodeVideo(codec, { ...config, width: canvas.width, height: canvas.height }),
                            options.signal
                        ))
                    )
                        continue;
                    await probeVideoEncoder(canvas, config, options);
                    selected = config;
                    break;
                } catch {
                    throwIfVideoExportAborted(options.signal);
                }
            }
            if (selected) break;
        }
        if (selected) {
            const { createVideoOutputSession, VideoOutputFinalizationError } = await import('./video-output');
            const source = new VideoSampleSource(selected);
            const session = await createVideoOutputSession(source, options);
            let endTime = 0;
            const encode = async (operation: Promise<void>) => {
                try {
                    await waitForVideoExportOperation(operation, options.signal);
                } catch (error) {
                    throwIfVideoExportAborted(options.signal);
                    if (error instanceof VideoExportStorageError) throw error;
                    throw new NativeVideoEncodingError(error);
                }
            };
            return {
                async addFrame(frame) {
                    throwIfVideoExportAborted(options.signal);
                    const timestamp = frame / options.fps;
                    await session.addAudioUntil(timestamp);
                    const sample = new VideoSample(canvas, { timestamp, duration: 1 / options.fps });
                    try {
                        await encode(source.add(sample));
                    } finally {
                        // Own the frame even while codec initialization is pending, so cancellation releases it now.
                        sample.close();
                    }
                    endTime = (frame + 1) / options.fps;
                    await session.addAudioUntil(endTime);
                },
                async complete() {
                    // Audio/storage failures propagate as-is; neither should rerender the entire video in WASM.
                    try {
                        return await session.complete(endTime);
                    } catch (error) {
                        if (error instanceof VideoOutputFinalizationError)
                            throw new NativeVideoEncodingError(error.cause);
                        throw error;
                    }
                },
                dispose: () => session.dispose(),
            };
        }
    }

    const { createSoftwareVideoFrameWriter } = await import('./video-encoder-software');
    return createSoftwareVideoFrameWriter(canvas, options);
};
