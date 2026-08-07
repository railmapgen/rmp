import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpegPromise: Promise<FFmpeg> | undefined;

const getFFmpeg = async (): Promise<FFmpeg> => {
    ffmpegPromise ??= (async () => {
        const ffmpeg = new FFmpeg();
        const abortController = new AbortController();
        const timeoutId = window.setTimeout(() => abortController.abort(), 30_000);

        try {
            await ffmpeg.load({ coreURL, wasmURL }, { signal: abortController.signal });
            return ffmpeg;
        } catch (error) {
            ffmpeg.terminate();
            if (abortController.signal.aborted) {
                throw new Error('Timed out while loading FFmpeg');
            }
            throw error;
        } finally {
            window.clearTimeout(timeoutId);
        }
    })();

    try {
        return await ffmpegPromise;
    } catch (error) {
        ffmpegPromise = undefined;
        throw error;
    }
};

export const getWebMToMP4Args = (inputName: string, outputName: string): string[] => [
    '-i',
    inputName,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputName,
];

export const transcodeWebMToMP4 = async (webmBlob: Blob, onProgress?: (progress: number) => void): Promise<Blob> => {
    onProgress?.(0);
    const ffmpeg = await getFFmpeg();
    onProgress?.(0.1);
    const fileId = crypto.randomUUID();
    const inputName = `rmp-${fileId}.webm`;
    const outputName = `rmp-${fileId}.mp4`;
    const handleProgress = ({ progress }: { progress: number }) => {
        onProgress?.(0.1 + Math.max(0, Math.min(1, progress)) * 0.9);
    };

    ffmpeg.on('progress', handleProgress);

    try {
        await ffmpeg.writeFile(inputName, await fetchFile(webmBlob));
        const exitCode = await ffmpeg.exec(getWebMToMP4Args(inputName, outputName));
        if (exitCode !== 0) {
            throw new Error(`FFmpeg exited with code ${exitCode}`);
        }

        const output = await ffmpeg.readFile(outputName);
        if (typeof output === 'string') {
            throw new Error('FFmpeg returned an invalid MP4 file');
        }

        onProgress?.(1);
        return new Blob([Uint8Array.from(output).buffer], { type: 'video/mp4' });
    } finally {
        ffmpeg.off('progress', handleProgress);
        await Promise.allSettled([ffmpeg.deleteFile(inputName), ffmpeg.deleteFile(outputName)]);
    }
};
