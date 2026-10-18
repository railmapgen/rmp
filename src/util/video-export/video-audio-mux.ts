import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import { FFmpeg } from '@ffmpeg/ffmpeg';

const RecentLogLines = 8;
const ffmpegLogs = new WeakMap<FFmpeg, string[]>();

/** Each export owns its worker and releases the grown WASM heap on termination. */
export const loadVideoFFmpeg = async (signal?: AbortSignal): Promise<FFmpeg> => {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Video export cancelled', 'AbortError');
    const ffmpeg = new FFmpeg();
    const logs: string[] = [];
    ffmpegLogs.set(ffmpeg, logs);
    ffmpeg.on('log', ({ message }) => {
        logs.push(message);
        if (logs.length > RecentLogLines) logs.shift();
    });
    const abortController = new AbortController();
    let terminated = false;
    const terminate = () => {
        if (terminated) return;
        terminated = true;
        ffmpeg.terminate();
    };
    let rejectAbort!: (reason: unknown) => void;
    const aborted = new Promise<never>((_resolve, reject) => {
        rejectAbort = reject;
    });
    const abort = (reason: unknown) => {
        rejectAbort(reason);
        abortController.abort(reason);
        terminate();
    };
    const onAbort = () => abort(signal?.reason ?? new DOMException('Video export cancelled', 'AbortError'));
    const timeout = window.setTimeout(() => abort(new Error('Video encoder loading timed out')), 90_000);
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
        if (signal?.aborted) onAbort();
        await Promise.race([ffmpeg.load({ coreURL, wasmURL }, { signal: abortController.signal }), aborted]);
        return ffmpeg;
    } catch (error) {
        terminate();
        throw error;
    } finally {
        window.clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);
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
