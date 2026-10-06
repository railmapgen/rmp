export interface VideoEncodingOptions {
    format: 'mp4' | 'webm';
    fps: number;
    quality: number;
    isTransparent: boolean;
    audioTracks?: { blob: Blob; start: number; end: number }[];
}

export interface VideoFrameWriter {
    addFrame: (frame: number) => Promise<void>;
    complete: () => Promise<Blob>;
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

const waitForNativeFrame = (operation: Promise<void>) =>
    new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Video frame encoding timed out')), 30_000);
        operation.then(
            () => {
                clearTimeout(timer);
                resolve();
            },
            error => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });

export const createVideoFrameWriter = async (
    canvas: HTMLCanvasElement,
    options: VideoEncodingOptions,
    forceSoftware = false
): Promise<VideoFrameWriter> => {
    if (!forceSoftware && typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
        const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, WebMOutputFormat, canEncodeVideo, Quality } =
            await import('mediabunny');
        const codecs = options.format === 'mp4' ? (['avc'] as const) : (['vp9', 'vp8'] as const);
        const quality = new Quality(Math.max(0, Math.min(1, options.quality / 100)));
        for (const codec of codecs) {
            const config = {
                codec,
                quality,
                latencyMode: 'quality' as const,
                // Baseline avoids WebKit's High-profile frame-reordering stall while preserving every frame.
                fullCodecString:
                    codec === 'avc' ? getAvcBaselineCodec(canvas.width, canvas.height, options.fps) : undefined,
                alpha: options.format === 'webm' && options.isTransparent ? ('keep' as const) : ('discard' as const),
            };
            let output: InstanceType<typeof Output> | undefined;
            try {
                if (
                    !(await canEncodeVideo(codec, {
                        ...config,
                        width: canvas.width,
                        height: canvas.height,
                    }))
                )
                    continue;
                const target = new BufferTarget();
                output = new Output({
                    format:
                        options.format === 'mp4'
                            ? new Mp4OutputFormat({ fastStart: 'in-memory' })
                            : new WebMOutputFormat(),
                    target,
                });
                const source = new CanvasSource(canvas, config);
                // The source validates the encoder again with this frame rate when its first frame arrives.
                output.addVideoTrack(source, { frameRate: options.fps });
                await output.start();
                const activeOutput = output;
                return {
                    async addFrame(frame) {
                        try {
                            await waitForNativeFrame(source.add(frame / options.fps, 1 / options.fps));
                        } catch (error) {
                            throw new NativeVideoEncodingError(error);
                        }
                    },
                    async complete() {
                        let video: Blob;
                        try {
                            await activeOutput.finalize();
                            if (!target.buffer) throw new Error('Video encoder returned no output');
                            video = new Blob([target.buffer], { type: `video/${options.format}` });
                        } catch (error) {
                            throw new NativeVideoEncodingError(error);
                        }
                        // Audio should not force all video frames through the slower WASM encoder.
                        // Copy the encoded picture into the final container when adding the soundtrack.
                        if (!options.audioTracks?.length) return video;
                        const { muxVideoAudio } = await import('./video-audio-mux');
                        return muxVideoAudio(video, options);
                    },
                    async dispose() {
                        if (activeOutput.state !== 'finalized') await activeOutput.cancel();
                    },
                };
            } catch {
                await output?.cancel().catch(() => undefined);
            }
        }
    }

    const { createSoftwareVideoFrameWriter } = await import('./video-encoder-software');
    return createSoftwareVideoFrameWriter(canvas, options);
};
