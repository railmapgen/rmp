import { BufferTarget, VideoSample, VideoSampleSource, Mp4OutputFormat, Output, WebMOutputFormat } from 'mediabunny';
import type { VideoEncodingConfig } from 'mediabunny';
import type { VideoEncodingOptions } from './video-encoder';
import { throwIfVideoExportAborted, waitForVideoExportOperation } from './video-export-control';
import { forceCloseVideoExportSource } from './video-export-source-cleanup';

/** canEncodeVideo omits FPS and the alpha encoder; exercise the real export configuration before rendering. */
export const probeVideoEncoder = async (
    size: { width: number; height: number },
    config: VideoEncodingConfig,
    options: VideoEncodingOptions
): Promise<void> => {
    throwIfVideoExportAborted(options.signal);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const output = new Output({
        format: options.format === 'mp4' ? new Mp4OutputFormat({ fastStart: false }) : new WebMOutputFormat(),
        // This isolated probe is only three frames, never the user's complete video.
        target: new BufferTarget(),
    });
    const source = new VideoSampleSource(config);
    try {
        output.addVideoTrack(source, { frameRate: options.fps });
        await waitForVideoExportOperation(output.start(), options.signal);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not create video encoding probe');
        for (let frame = 0; frame < 3; frame++) {
            throwIfVideoExportAborted(options.signal);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = frame === 1 ? 'rgba(0, 100, 200, 0.5)' : '#336699';
            ctx.fillRect(frame, frame, Math.max(1, canvas.width / 2), Math.max(1, canvas.height / 2));
            const sample = new VideoSample(canvas, { timestamp: frame / options.fps, duration: 1 / options.fps });
            try {
                await waitForVideoExportOperation(source.add(sample), options.signal);
            } finally {
                sample.close();
            }
        }
        await waitForVideoExportOperation(output.finalize(), options.signal);
    } finally {
        if (output.state !== 'finalized') {
            await forceCloseVideoExportSource(source).catch(() => undefined);
            await output.cancel().catch(() => undefined);
        }
        canvas.width = 0;
        canvas.height = 0;
    }
};
