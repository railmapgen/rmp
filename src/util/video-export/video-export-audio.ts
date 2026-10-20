import { AudioSample, type AudioSource } from 'mediabunny';
import { createExportAudioEncoder } from './video-export-audio-codecs';
import {
    checkAudioAbort,
    createExportAudioDecodePool,
    createExportAudioDecoder,
    ExportAudioSampleRate,
    type ExportAudioPcmChunk,
} from './video-export-audio-decode';

const BlockFrames = 960; // 20 ms, including silence; never allocate the entire timeline's PCM.
const FilterRadius = 12;

export interface VideoExportAudioTrack {
    blob: Blob;
    start: number;
    end: number;
}

export interface VideoExportAudio {
    source: AudioSource;
    addUntil(time: number): Promise<void>;
    complete(duration: number): Promise<void>;
    dispose(): Promise<void>;
}

type Decoder = Awaited<ReturnType<typeof createExportAudioDecoder>>;

/** Keeps only the chunks intersecting the current resampling window and a small filter history. */
class PcmWindow {
    private chunks: ExportAudioPcmChunk[] = [];
    private readEnd = 0;
    eof = false;

    constructor(readonly decoder: Decoder) {}

    get endFrame() {
        return this.readEnd;
    }

    async read(start: number, end: number) {
        this.chunks = this.chunks.filter(chunk => chunk.start + chunk.left.length > start);
        while (!this.eof && this.readEnd < end) {
            const next = await this.decoder.iterator.next();
            if (next.done) {
                this.eof = true;
                break;
            }
            this.chunks.push(next.value);
            this.readEnd = Math.max(this.readEnd, next.value.start + next.value.left.length);
        }
        const left = new Float32Array(end - start);
        const right = new Float32Array(end - start);
        for (const chunk of this.chunks) {
            const from = Math.max(start, chunk.start);
            const to = Math.min(end, chunk.start + chunk.left.length);
            if (to <= from) continue;
            left.set(chunk.left.subarray(from - chunk.start, to - chunk.start), from - start);
            right.set(chunk.right.subarray(from - chunk.start, to - chunk.start), from - start);
        }
        return { left, right };
    }

    async dispose() {
        this.chunks.length = 0;
        await this.decoder.dispose();
    }
}

const sinc = (value: number) => (Math.abs(value) < 1e-8 ? 1 : Math.sin(Math.PI * value) / (Math.PI * value));

/** Absolute sample positions preserve phase across blocks; the low-pass window limits downsampling aliasing. */
const resample = (
    input: { left: Float32Array; right: Float32Array },
    start: number,
    ratio: number,
    firstOutputFrame: number,
    frames: number
) => {
    const left = new Float32Array(frames);
    const right = new Float32Array(frames);
    const cutoff = Math.min(1, 1 / ratio);
    for (let i = 0; i < frames; i++) {
        const position = (firstOutputFrame + i) * ratio;
        if (ratio === 1) {
            left[i] = input.left[position - start] ?? 0;
            right[i] = input.right[position - start] ?? 0;
            continue;
        }
        const center = Math.floor(position);
        let weightSum = 0;
        let l = 0;
        let r = 0;
        for (let tap = center - FilterRadius + 1; tap <= center + FilterRadius; tap++) {
            const distance = tap - position;
            const weight = cutoff * sinc(distance * cutoff) * sinc(distance / FilterRadius);
            weightSum += weight;
            l += (input.left[tap - start] ?? 0) * weight;
            r += (input.right[tap - start] ?? 0) * weight;
        }
        left[i] = weightSum ? l / weightSum : 0;
        right[i] = weightSum ? r / weightSum : 0;
    }
    return { left, right };
};

export const createVideoExportAudio = async (
    tracks: VideoExportAudioTrack[],
    format: 'mp4' | 'webm',
    signal?: AbortSignal
): Promise<VideoExportAudio | undefined> => {
    const placed = tracks
        .filter(track => Number.isFinite(track.start) && Number.isFinite(track.end) && track.end > track.start)
        .map(track => {
            // Match the previous FFmpeg adelay's millisecond placement, while keeping duration sample-accurate.
            const start = Math.round((Math.round(Math.max(0, track.start) * 1000) * ExportAudioSampleRate) / 1000);
            const length = Math.round((track.end - track.start) * ExportAudioSampleRate);
            return { track, start, length, end: start + length, window: undefined as PcmWindow | undefined };
        });
    if (!placed.length) return undefined;
    checkAudioAbort(signal);
    const controller = new AbortController();
    const onAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', onAbort, { once: true });
    const activeSignal = controller.signal;
    const encoder = await createExportAudioEncoder(format, activeSignal).catch(error => {
        signal?.removeEventListener('abort', onAbort);
        throw error;
    });
    const decodePool = createExportAudioDecodePool(activeSignal);
    let written = 0;
    let disposed = false;
    let completed = false;

    const addUntilFrame = async (target: number) => {
        if (disposed) throw new Error('Export audio has been disposed');
        while (written < target) {
            checkAudioAbort(activeSignal);
            const frames = Math.min(BlockFrames, target - written);
            const mixed = new Float32Array(frames * 2);
            const counts = new Uint32Array(frames);
            for (const state of placed) {
                if (state.end <= written) continue;
                const from = Math.max(written, state.start);
                const to = Math.min(written + frames, state.end);
                if (to > from) {
                    state.window ??= new PcmWindow(
                        await createExportAudioDecoder(
                            state.track.blob,
                            state.length / ExportAudioSampleRate,
                            activeSignal,
                            decodePool
                        )
                    );
                    const ratio = state.window.decoder.sampleRate / ExportAudioSampleRate;
                    const relative = from - state.start;
                    const nativeStart = Math.max(0, Math.floor(relative * ratio) - FilterRadius);
                    const nativeEnd = Math.ceil((to - state.start) * ratio) + FilterRadius + 1;
                    const data = await state.window.read(nativeStart, nativeEnd);
                    if (state.window.eof) {
                        state.end = Math.min(state.end, state.start + Math.round(state.window.endFrame / ratio));
                    }
                    const audio = resample(data, nativeStart, ratio, relative, to - from);
                    const fadeFrames = Math.min(ExportAudioSampleRate / 2, state.length);
                    const fadeStart = state.length - fadeFrames;
                    for (let i = 0; i < audio.left.length && from + i < state.end; i++) {
                        const local = relative + i;
                        const gain = local < fadeStart ? 1 : Math.max(0, (state.length - local) / fadeFrames);
                        const index = from + i - written;
                        mixed[index] += audio.left[i] * gain;
                        mixed[frames + index] += audio.right[i] * gain;
                    }
                }
                // FFmpeg amix normalizes all live inputs, including the silence before an adelay starts.
                for (let i = 0; i < frames && written + i < state.end; i++) counts[i]++;
                if (state.end <= written + frames && state.window) {
                    await state.window.dispose();
                    state.window = undefined;
                }
            }
            for (let i = 0; i < frames; i++) {
                if (counts[i]) {
                    mixed[i] /= counts[i];
                    mixed[frames + i] /= counts[i];
                }
            }
            const sample = new AudioSample({
                data: mixed,
                format: 'f32-planar',
                numberOfChannels: 2,
                sampleRate: ExportAudioSampleRate,
                timestamp: written / ExportAudioSampleRate,
            });
            try {
                await encoder.add(sample);
            } finally {
                sample.close();
            }
            written += frames;
        }
    };

    return {
        source: encoder.source,
        async addUntil(time) {
            if (completed) throw new Error('Export audio is already complete');
            if (!Number.isFinite(time)) throw new Error('Export audio time must be finite');
            // Leave the fractional block for complete(), so the final output never extends past the video.
            const target = Math.floor((Math.max(0, time) * ExportAudioSampleRate) / BlockFrames) * BlockFrames;
            await addUntilFrame(target);
        },
        async complete(duration) {
            if (completed) return;
            if (!Number.isFinite(duration)) throw new Error('Export audio duration must be finite');
            await addUntilFrame(Math.round(Math.max(0, duration) * ExportAudioSampleRate));
            await encoder.complete();
            completed = true;
        },
        async dispose() {
            if (disposed) return;
            disposed = true;
            signal?.removeEventListener('abort', onAbort);
            controller.abort(new DOMException('Export audio disposed', 'AbortError'));
            await Promise.allSettled(placed.map(state => state.window?.dispose()));
            await decodePool.dispose();
            await encoder.dispose();
        },
    };
};
