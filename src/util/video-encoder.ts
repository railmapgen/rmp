export interface VideoEncodingOptions {
    format: 'mp4' | 'webm';
    fps: number;
    quality: number;
    isTransparent: boolean;
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
                alpha: options.format === 'webm' && options.isTransparent ? ('keep' as const) : ('discard' as const),
            };
            let output: InstanceType<typeof Output> | undefined;
            try {
                if (!(await canEncodeVideo(codec, { ...config, width: canvas.width, height: canvas.height }))) continue;
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
                            await source.add(frame / options.fps, 1 / options.fps);
                        } catch (error) {
                            throw new NativeVideoEncodingError(error);
                        }
                    },
                    async complete() {
                        try {
                            await activeOutput.finalize();
                            if (!target.buffer) throw new Error('Video encoder returned no output');
                            return new Blob([target.buffer], { type: `video/${options.format}` });
                        } catch (error) {
                            throw new NativeVideoEncodingError(error);
                        }
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
