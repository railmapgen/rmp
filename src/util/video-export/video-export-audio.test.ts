import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioSample } from 'mediabunny';
import { createVideoExportAudio } from './video-export-audio';

const mocks = vi.hoisted(() => ({
    add: vi.fn(),
    complete: vi.fn(),
    disposeEncoder: vi.fn(),
    disposePool: vi.fn(),
    decoder: vi.fn(),
    disposeDecoder: vi.fn(),
    reads: 0,
    source: { close: vi.fn() },
    output: [] as { timestamp: number; left: Float32Array; right: Float32Array }[],
    inputs: new Map<Blob, { sampleRate?: number; duration: number; value: (frame: number) => number }>(),
}));

vi.mock('./video-export-audio-codecs', () => ({
    createExportAudioEncoder: async () => ({
        source: mocks.source,
        add: mocks.add,
        complete: mocks.complete,
        dispose: mocks.disposeEncoder,
    }),
}));
vi.mock('./video-export-audio-decode', () => ({
    ExportAudioSampleRate: 48_000,
    checkAudioAbort(signal?: AbortSignal) {
        if (signal?.aborted) throw signal.reason;
    },
    createExportAudioDecodePool: () => ({ dispose: mocks.disposePool }),
    createExportAudioDecoder: mocks.decoder,
}));

const makeAudio = (duration = 2, value: (frame: number) => number = () => 1, sampleRate = 48_000) => {
    const blob = new Blob();
    mocks.inputs.set(blob, { duration, value, sampleRate });
    return blob;
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.inputs.clear();
    mocks.output.length = 0;
    mocks.reads = 0;
    mocks.add.mockImplementation(async (sample: AudioSample) => {
        const left = new Float32Array(sample.numberOfFrames);
        const right = new Float32Array(sample.numberOfFrames);
        sample.copyTo(left, { planeIndex: 0, format: 'f32-planar' });
        sample.copyTo(right, { planeIndex: 1, format: 'f32-planar' });
        mocks.output.push({ timestamp: sample.timestamp, left, right });
    });
    mocks.decoder.mockImplementation(async (blob: Blob) => {
        const input = mocks.inputs.get(blob)!;
        const sampleRate = input.sampleRate ?? 48_000;
        async function* samples() {
            for (let start = 0; start < input.duration * sampleRate; start += 1024) {
                mocks.reads++;
                const count = Math.min(1024, Math.round(input.duration * sampleRate) - start);
                const left = Float32Array.from({ length: count }, (_, i) => input.value(start + i));
                yield { start, left, right: left };
            }
        }
        const iterator = samples();
        return {
            sampleRate,
            iterator,
            async dispose() {
                mocks.disposeDecoder();
                await iterator.return(undefined);
            },
        };
    });
});

describe('streaming video export audio', () => {
    it('creates no encoder or decoder without placed audio', async () => {
        expect(await createVideoExportAudio([], 'mp4')).toBeUndefined();
        expect(await createVideoExportAudio([{ blob: makeAudio(), start: 1, end: 1 }], 'mp4')).toBeUndefined();
        expect(mocks.decoder).not.toHaveBeenCalled();
    });

    it('bounds PCM blocks and reads only the input needed by the video progress', async () => {
        const audio = await createVideoExportAudio([{ blob: makeAudio(3600), start: 0, end: 3600 }], 'mp4');
        await audio!.addUntil(0.061);
        expect(mocks.output).toHaveLength(3);
        expect(mocks.reads).toBeLessThanOrEqual(4);
        await audio!.complete(0.061);
        expect(mocks.output.map(block => block.left.length)).toEqual([960, 960, 960, 48]);
        expect(mocks.output.at(-1)!.timestamp).toBe(0.06);
        expect(mocks.complete).toHaveBeenCalledOnce();
        await audio!.dispose();
        expect(mocks.disposeDecoder).toHaveBeenCalledOnce();
        expect(mocks.disposePool).toHaveBeenCalledOnce();
        expect(mocks.disposeEncoder).toHaveBeenCalledOnce();
    });

    it('emits bounded continuous silence before a late clip, without opening its source', async () => {
        const audio = await createVideoExportAudio([{ blob: makeAudio(), start: 3600, end: 3602 }], 'webm');
        await audio!.addUntil(0.1);
        expect(mocks.output).toHaveLength(5);
        expect(mocks.output.every(block => block.left.length === 960 && block.left.every(value => value === 0))).toBe(
            true
        );
        expect(mocks.decoder).not.toHaveBeenCalled();
        await audio!.dispose();
    });

    it('preserves delayed-input normalization, half-second fade, and normalization after a clip ends', async () => {
        const audio = await createVideoExportAudio(
            [
                { blob: makeAudio(), start: 0, end: 1 },
                { blob: makeAudio(), start: 0.5, end: 1.5 },
            ],
            'mp4'
        );
        await audio!.complete(1.6);
        const sampleAt = (time: number) => mocks.output.find(block => Math.abs(block.timestamp - time) < 1e-8)!.left[0];
        expect(sampleAt(0)).toBe(0.5);
        expect(sampleAt(0.6)).toBeCloseTo(0.9);
        expect(sampleAt(1.1)).toBeCloseTo(0.8);
        expect(sampleAt(1.5)).toBe(0);
        await audio!.dispose();
    });

    it('removes an exhausted source from normalization at its actual end', async () => {
        const audio = await createVideoExportAudio(
            [
                { blob: makeAudio(0.025), start: 0, end: 2 },
                { blob: makeAudio(), start: 0, end: 2 },
            ],
            'mp4'
        );
        await audio!.complete(0.06);
        expect(mocks.output[1].left[200]).toBe(1);
        expect(mocks.output[1].left[300]).toBe(1);
        expect(mocks.output[2].left[0]).toBe(1);
        expect(mocks.disposeDecoder).toHaveBeenCalledOnce();
        await audio!.dispose();
    });

    it('resamples 44.1 kHz across decoder and output block boundaries without resetting phase', async () => {
        const frequency = 1000;
        const blob = makeAudio(1, frame => Math.sin((2 * Math.PI * frequency * frame) / 44_100), 44_100);
        const audio = await createVideoExportAudio([{ blob, start: 0, end: 1 }], 'webm');
        await audio!.addUntil(0.06);
        for (const frame of [958, 959, 960, 961, 1919, 1920, 1921]) {
            const block = mocks.output[Math.floor(frame / 960)];
            expect(block.left[frame % 960]).toBeCloseTo(Math.sin((2 * Math.PI * frequency * frame) / 48_000), 2);
        }
        await audio!.dispose();
    });

    it('closes submitted samples even if encoding fails and can dispose repeatedly', async () => {
        let submitted: AudioSample | undefined;
        mocks.add.mockImplementation(async sample => {
            submitted = sample;
            throw new Error('encoder failed');
        });
        const audio = await createVideoExportAudio([{ blob: makeAudio(), start: 0, end: 1 }], 'mp4');
        await expect(audio!.addUntil(0.02)).rejects.toThrow('encoder failed');
        expect(() => submitted!.copyTo(new Float32Array(960), { planeIndex: 0 })).toThrow('closed');
        await audio!.dispose();
        await audio!.dispose();
        expect(mocks.disposeEncoder).toHaveBeenCalledOnce();
    });

    it('stops producing audio after cancellation', async () => {
        const controller = new AbortController();
        const audio = await createVideoExportAudio([{ blob: makeAudio(), start: 0, end: 1 }], 'mp4', controller.signal);
        await audio!.addUntil(0.02);
        controller.abort(new Error('cancelled'));
        await expect(audio!.addUntil(0.06)).rejects.toThrow('cancelled');
        expect(mocks.add).toHaveBeenCalledOnce();
        await audio!.dispose();
    });
});
