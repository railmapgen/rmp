import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import type { VideoEncodingOptions } from './video-encoder';

const AudioFadeOutSeconds = 0.5;
const RecentLogLines = 8;
const ffmpegLogs = new WeakMap<FFmpeg, string[]>();

/** Each export owns its worker and releases the grown WASM heap on termination. */
export const loadVideoFFmpeg = async (): Promise<FFmpeg> => {
    const ffmpeg = new FFmpeg();
    const logs: string[] = [];
    ffmpegLogs.set(ffmpeg, logs);
    ffmpeg.on('log', ({ message }) => {
        logs.push(message);
        if (logs.length > RecentLogLines) logs.shift();
    });
    const abortController = new AbortController();
    const timeout = window.setTimeout(() => abortController.abort(), 90_000);
    try {
        await ffmpeg.load({ coreURL, wasmURL }, { signal: abortController.signal });
        return ffmpeg;
    } catch (error) {
        ffmpeg.terminate();
        throw error;
    } finally {
        window.clearTimeout(timeout);
    }
};

export const execVideoFFmpeg = async (ffmpeg: FFmpeg, args: string[]): Promise<void> => {
    const logs = ffmpegLogs.get(ffmpeg);
    if (logs) logs.length = 0;
    const code = await ffmpeg.exec(args);
    if (code !== 0) {
        const details = logs?.length ? `\n${logs.join('\n')}` : '';
        throw new Error(`Video encoder exited with code ${code}${details}`);
    }
};

/** Mix placed clips into an existing video without re-encoding its frames. Consumes inputName. */
export const mixVideoAudio = async (
    ffmpeg: FFmpeg,
    inputName: string,
    options: VideoEncodingOptions
): Promise<Blob> => {
    const audioNames: string[] = [];
    const outputName = `muxed.${options.format}`;
    const tracks = options.audioTracks ?? [];
    try {
        for (const [index, track] of tracks.entries()) {
            const extension = track.blob.type.includes('wav')
                ? 'wav'
                : track.blob.type.includes('mpeg') || track.blob.type.includes('mp3')
                  ? 'mp3'
                  : track.blob.type.includes('ogg')
                    ? 'ogg'
                    : track.blob.type.includes('mp4') || track.blob.type.includes('m4a')
                      ? 'm4a'
                      : 'webm';
            const name = `audio-${index}.${extension}`;
            audioNames.push(name);
            await ffmpeg.writeFile(name, new Uint8Array(await track.blob.arrayBuffer()));
        }
        if (tracks.length) {
            // Play each source once, trimming it to its authored span. The final pad keeps the video duration intact.
            const audioInputs = tracks.map((_, index) => ['-i', audioNames[index]]).flat();
            const filters = tracks.map((track, index) => {
                const length = Math.max(0, track.end - track.start);
                const fadeDuration = Math.min(AudioFadeOutSeconds, length);
                const fadeStart = Math.max(0, length - fadeDuration);
                return `[${index + 1}:a]atrim=0:${length},asetpts=PTS-STARTPTS,afade=t=out:st=${fadeStart}:d=${fadeDuration},adelay=${Math.round(track.start * 1000)}:all=1[a${index}]`;
            });
            const mixInputs = tracks.map((_, index) => `[a${index}]`).join('');
            filters.push(`${mixInputs}amix=inputs=${tracks.length}:duration=longest:dropout_transition=0,apad[aout]`);
            await execVideoFFmpeg(ffmpeg, [
                '-i',
                inputName,
                ...audioInputs,
                '-filter_complex',
                filters.join(';'),
                '-map',
                '0:v:0',
                '-map',
                '[aout]',
                '-c:v',
                'copy',
                '-c:a',
                options.format === 'mp4' ? 'aac' : 'libopus',
                '-shortest',
                ...(options.format === 'mp4' ? ['-movflags', '+faststart'] : []),
                outputName,
            ]);
        }
        const data = await ffmpeg.readFile(tracks.length ? outputName : inputName);
        if (typeof data === 'string' || !data.byteLength) throw new Error('Audio muxing returned no output');
        return new Blob([Uint8Array.from(data).buffer], { type: `video/${options.format}` });
    } finally {
        await Promise.allSettled([inputName, ...audioNames, outputName].map(name => ffmpeg.deleteFile(name)));
    }
};

/** Native video encoding only needs FFmpeg for the final audio mix and container copy. */
export const muxVideoAudio = async (video: Blob, options: VideoEncodingOptions): Promise<Blob> => {
    if (!options.audioTracks?.length) return video;
    const ffmpeg = await loadVideoFFmpeg();
    try {
        const inputName = `video.${options.format}`;
        await ffmpeg.writeFile(inputName, new Uint8Array(await video.arrayBuffer()));
        return await mixVideoAudio(ffmpeg, inputName, options);
    } finally {
        ffmpeg.terminate();
    }
};
