import { FFFSType } from '@ffmpeg/ffmpeg';
import { ALL_FORMATS, AudioSampleSink, BlobSource, Input } from 'mediabunny';
import { execVideoFFmpeg, loadVideoFFmpeg } from './video-audio-mux';

export const ExportAudioSampleRate = 48_000;
const DecodeWindowFrames = ExportAudioSampleRate * 2;
const CopyFrames = 4096;

export interface ExportAudioPcmChunk {
    start: number;
    left: Float32Array;
    right: Float32Array;
}

export const checkAudioAbort = (signal?: AbortSignal) => {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Export cancelled', 'AbortError');
};

/** A single export-local decoder worker is shared by overlapping fallback tracks. */
export const createExportAudioDecodePool = (signal?: AbortSignal) => {
    let worker: ReturnType<typeof loadVideoFFmpeg> | undefined;
    let windows = 0;
    let disposed = false;
    const terminate = () => {
        void worker?.then(
            ffmpeg => ffmpeg.terminate(),
            () => undefined
        );
    };
    signal?.addEventListener('abort', terminate, { once: true });
    return {
        async read(blob: Blob, start: number, frames: number) {
            checkAudioAbort(signal);
            if (disposed) throw new Error('Audio decoder is disposed');
            // Window decodes are independent, so rebuilding here safely releases a grown WASM heap.
            if (worker && windows >= 32) {
                (await worker).terminate();
                worker = undefined;
                windows = 0;
            }
            worker ??= loadVideoFFmpeg(signal);
            const ffmpeg = await worker;
            checkAudioAbort(signal);
            await ffmpeg.createDir('/source').catch(() => undefined);
            if (!(await ffmpeg.mount(FFFSType.WORKERFS, { blobs: [{ name: 'audio', data: blob }] }, '/source')))
                throw new Error('This browser cannot read export audio without copying the complete source');
            try {
                // Decoder/filter history is discarded before the window, never encoded into separate AAC/Opus files.
                const seek = Math.max(0, start - ExportAudioSampleRate / 4);
                const skip = start - seek;
                await execVideoFFmpeg(ffmpeg, [
                    '-ss',
                    String(seek / ExportAudioSampleRate),
                    '-t',
                    String((skip + frames) / ExportAudioSampleRate),
                    '-i',
                    '/source/audio',
                    '-vn',
                    '-af',
                    `aresample=${ExportAudioSampleRate},atrim=start_sample=${skip}:end_sample=${skip + frames},asetpts=PTS-STARTPTS`,
                    '-ac',
                    '2',
                    '-f',
                    'f32le',
                    '-c:a',
                    'pcm_f32le',
                    'window.pcm',
                ]);
                const data = await ffmpeg.readFile('window.pcm');
                if (typeof data === 'string') throw new Error('Audio decoder returned nonbinary PCM');
                windows++;
                return data;
            } finally {
                await Promise.allSettled([ffmpeg.deleteFile('window.pcm'), ffmpeg.unmount('/source')]);
            }
        },
        async dispose() {
            if (disposed) return;
            disposed = true;
            signal?.removeEventListener('abort', terminate);
            if (worker) (await worker.catch(() => undefined))?.terminate();
            worker = undefined;
        },
    };
};

type DecodePool = ReturnType<typeof createExportAudioDecodePool>;

/** Neither the input nor a complete PCM file is copied into MEMFS. */
async function* decodeSoftware(blob: Blob, duration: number, pool: DecodePool, signal?: AbortSignal) {
    const totalFrames = Math.ceil(duration * ExportAudioSampleRate);
    for (let start = 0; start < totalFrames; start += DecodeWindowFrames) {
        checkAudioAbort(signal);
        const frames = Math.min(DecodeWindowFrames, totalFrames - start);
        const data = await pool.read(blob, start, frames);
        const count = Math.min(frames, Math.floor(data.byteLength / 8));
        if (!count) break;
        const view = new DataView(data.buffer, data.byteOffset, count * 8);
        // Keeping small chunks also bounds the mixer's read-ahead when the iterator pauses.
        for (let offset = 0; offset < count; offset += CopyFrames) {
            const size = Math.min(CopyFrames, count - offset);
            const left = new Float32Array(size);
            const right = new Float32Array(size);
            for (let i = 0; i < size; i++) {
                left[i] = view.getFloat32((offset + i) * 8, true);
                right[i] = view.getFloat32((offset + i) * 8 + 4, true);
            }
            yield { start: start + offset, left, right };
        }
        if (count < frames) break;
    }
}

export const createExportAudioDecoder = async (
    blob: Blob,
    duration: number,
    signal: AbortSignal | undefined,
    pool: DecodePool
) => {
    checkAudioAbort(signal);
    const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
    const disposeInput = () => input.dispose();
    signal?.addEventListener('abort', disposeInput, { once: true });
    const cleanupInput = () => {
        signal?.removeEventListener('abort', disposeInput);
        input.dispose();
    };
    try {
        const track = await input.getPrimaryAudioTrack();
        // Unsupported demuxers/codecs are handled by the existing FFmpeg build, only for audio.
        if (!track || !(await track.canDecode()) || (await track.getNumberOfChannels()) > 2) {
            cleanupInput();
            const iterator = decodeSoftware(blob, duration, pool, signal);
            return { sampleRate: ExportAudioSampleRate, iterator, dispose: () => iterator.return(undefined) };
        }
        const sampleRate = await track.getSampleRate();
        const firstTimestamp = Math.max(0, await track.getFirstTimestamp());
        const sink = new AudioSampleSink(track);
        async function* decode(): AsyncGenerator<ExportAudioPcmChunk> {
            try {
                for await (const sample of sink.samples(firstTimestamp, firstTimestamp + duration)) {
                    try {
                        checkAudioAbort(signal);
                        const start = Math.round((sample.timestamp - firstTimestamp) * sampleRate);
                        for (let offset = Math.max(0, -start); offset < sample.numberOfFrames; offset += CopyFrames) {
                            const count = Math.min(CopyFrames, sample.numberOfFrames - offset);
                            const left = new Float32Array(count);
                            sample.copyTo(left, {
                                planeIndex: 0,
                                format: 'f32-planar',
                                frameOffset: offset,
                                frameCount: count,
                            });
                            let right = left;
                            if (sample.numberOfChannels > 1) {
                                right = new Float32Array(count);
                                sample.copyTo(right, {
                                    planeIndex: 1,
                                    format: 'f32-planar',
                                    frameOffset: offset,
                                    frameCount: count,
                                });
                            }
                            yield { start: start + offset, left, right };
                        }
                    } finally {
                        sample.close();
                    }
                }
            } finally {
                cleanupInput();
            }
        }
        const iterator = decode();
        return {
            sampleRate,
            iterator,
            async dispose() {
                cleanupInput();
                await iterator.return(undefined);
            },
        };
    } catch (error) {
        cleanupInput();
        checkAudioAbort(signal);
        // A format understood by FFmpeg might not be understood by Mediabunny.
        const iterator = decodeSoftware(blob, duration, pool, signal);
        return { sampleRate: ExportAudioSampleRate, iterator, dispose: () => iterator.return(undefined) };
    }
};
