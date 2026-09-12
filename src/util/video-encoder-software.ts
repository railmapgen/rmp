import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import type { VideoEncodingOptions, VideoFrameWriter } from './video-encoder';

const MaxBatchBytes = 32 * 1024 * 1024;
const MaxBatchFrames = 30;

export const createSoftwareVideoFrameWriter = async (
    canvas: HTMLCanvasElement,
    options: VideoEncodingOptions
): Promise<VideoFrameWriter> => {
    // Each export owns its worker and filesystem. Terminating it also releases WASM's grown heap.
    const ffmpeg = new FFmpeg();
    const abortController = new AbortController();
    const timeout = window.setTimeout(() => abortController.abort(), 90_000);
    try {
        await ffmpeg.load({ coreURL, wasmURL }, { signal: abortController.signal });
    } catch (error) {
        ffmpeg.terminate();
        throw error;
    } finally {
        window.clearTimeout(timeout);
    }

    const frameNames: string[] = [];
    const segments: { name: string; frames: number }[] = [];
    const batchSize = Math.max(
        1,
        Math.min(MaxBatchFrames, Math.floor(MaxBatchBytes / (canvas.width * canvas.height * 4)))
    );
    let batchBytes = 0;
    const quality = Math.max(1, Math.min(100, options.quality));
    const crf = Math.round(options.format === 'mp4' ? 40 - quality * 0.24 : 55 - quality * 0.35);
    const bitrate = Math.max(
        250_000,
        Math.round(canvas.width * canvas.height * options.fps * (0.04 + quality * 0.0016))
    );

    const exec = async (args: string[]) => {
        const code = await ffmpeg.exec(args);
        if (code !== 0) throw new Error(`Video encoder exited with code ${code}`);
    };

    const flushBatch = async () => {
        if (!frameNames.length) return;
        const name = `segment-${segments.length}.${options.format}`;
        try {
            await exec([
                '-framerate',
                String(options.fps),
                '-i',
                'frame-%06d.png',
                '-an',
                ...(options.format === 'mp4'
                    ? ['-c:v', 'libx264', '-preset', 'veryfast', '-bf', '0', '-pix_fmt', 'yuv420p']
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
                String(frameNames.length),
                name,
            ]);
            segments.push({ name, frames: frameNames.length });
        } finally {
            await Promise.allSettled(frameNames.map(frameName => ffmpeg.deleteFile(frameName)));
            frameNames.length = 0;
            batchBytes = 0;
        }
    };

    return {
        async addFrame() {
            // PNG encoding is supported on Safari and preserves alpha for transparent WebM.
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    value => (value ? resolve(value) : reject(new Error('Could not encode video frame'))),
                    'image/png'
                );
            });
            const name = `frame-${String(frameNames.length).padStart(6, '0')}.png`;
            await ffmpeg.writeFile(name, new Uint8Array(await blob.arrayBuffer()));
            frameNames.push(name);
            batchBytes += blob.size;
            if (frameNames.length >= batchSize || batchBytes >= MaxBatchBytes) await flushBatch();
        },
        async complete() {
            await flushBatch();
            if (!segments.length) throw new Error('No video frames to encode');
            // FFmpeg stores concat durations in microseconds. Round absolute frame boundaries so short
            // batches at 30/60 FPS don't accumulate a rounding error over long exports.
            let frameOffset = 0;
            const manifest = segments
                .map(({ name, frames }) => {
                    const start = Math.round((frameOffset * 1_000_000) / options.fps);
                    frameOffset += frames;
                    const end = Math.round((frameOffset * 1_000_000) / options.fps);
                    return `file '${name}'\nduration ${(end - start) / 1_000_000}\n`;
                })
                .join('');
            await ffmpeg.writeFile('segments.txt', new TextEncoder().encode(manifest));
            const outputName = `output.${options.format}`;
            await exec([
                '-f',
                'concat',
                '-safe',
                '0',
                '-i',
                'segments.txt',
                '-c',
                'copy',
                ...(options.format === 'mp4' ? ['-movflags', '+faststart'] : []),
                outputName,
            ]);
            const data = await ffmpeg.readFile(outputName);
            if (typeof data === 'string' || !data.byteLength) throw new Error('Video encoder returned no output');
            return new Blob([Uint8Array.from(data).buffer], { type: `video/${options.format}` });
        },
        async dispose() {
            ffmpeg.terminate();
        },
    };
};
