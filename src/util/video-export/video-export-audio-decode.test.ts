import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioSample } from 'mediabunny';
import { createExportAudioDecodePool, createExportAudioDecoder } from './video-export-audio-decode';

const mocks = vi.hoisted(() => ({
    load: vi.fn(),
    exec: vi.fn(),
    createDir: vi.fn(),
    mount: vi.fn(),
    unmount: vi.fn(),
    readFile: vi.fn(),
    deleteFile: vi.fn(),
    terminate: vi.fn(),
    disposeInput: vi.fn(),
    getTrack: vi.fn(),
    samples: vi.fn(),
    canDecode: vi.fn(),
}));
vi.mock('./video-audio-mux', () => ({ loadVideoFFmpeg: mocks.load, execVideoFFmpeg: mocks.exec }));
vi.mock('@ffmpeg/ffmpeg', () => ({ FFFSType: { WORKERFS: 'WORKERFS' } }));
vi.mock('mediabunny', async importOriginal => {
    const original = await importOriginal<typeof import('mediabunny')>();
    return {
        ...original,
        Input: class {
            getPrimaryAudioTrack = mocks.getTrack;
            dispose = mocks.disposeInput;
        },
        AudioSampleSink: class {
            samples = mocks.samples;
        },
    };
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.load.mockResolvedValue(mocks);
    mocks.exec.mockResolvedValue(undefined);
    mocks.createDir.mockResolvedValue(undefined);
    mocks.mount.mockResolvedValue(true);
    mocks.readFile.mockResolvedValue(new Uint8Array(new Float32Array([0.25, 0.5, 0.75, 1]).buffer));
    mocks.canDecode.mockResolvedValue(false);
    mocks.getTrack.mockResolvedValue({
        canDecode: mocks.canDecode,
        getNumberOfChannels: async () => 1,
        getSampleRate: async () => 44_100,
        getFirstTimestamp: async () => 0,
    });
});

describe('bounded export audio decoding', () => {
    it('mounts unsupported audio as a Blob and immediately removes each PCM window', async () => {
        const blob = new Blob(['compressed audio']);
        const readAll = vi.fn(() => {
            throw new Error('Whole input must not be copied');
        });
        Object.assign(blob, { arrayBuffer: readAll });
        const pool = createExportAudioDecodePool();
        const decoder = await createExportAudioDecoder(blob, 3600, undefined, pool);
        expect(mocks.load).not.toHaveBeenCalled();
        const next = await decoder.iterator.next();
        expect(next.value).toEqual({
            start: 0,
            left: new Float32Array([0.25, 0.75]),
            right: new Float32Array([0.5, 1]),
        });
        expect(readAll).not.toHaveBeenCalled();
        expect(mocks.mount).toHaveBeenCalledWith('WORKERFS', { blobs: [{ name: 'audio', data: blob }] }, '/source');
        expect(mocks.exec.mock.calls[0][1]).toEqual(
            expect.arrayContaining(['-t', '2', '/source/audio', 'f32le', 'window.pcm'])
        );
        expect(mocks.deleteFile).toHaveBeenCalledWith('window.pcm');
        expect(mocks.unmount).toHaveBeenCalledWith('/source');
        await decoder.dispose();
        await pool.dispose();
        expect(mocks.terminate).toHaveBeenCalledOnce();
    });

    it('shares one software worker across inputs and rebuilds it after a bounded number of windows', async () => {
        const pool = createExportAudioDecodePool();
        for (let index = 0; index < 33; index++) await pool.read(new Blob(), index * 960, 960);
        expect(mocks.load).toHaveBeenCalledTimes(2);
        expect(mocks.terminate).toHaveBeenCalledOnce();
        await pool.dispose();
        await pool.dispose();
        expect(mocks.terminate).toHaveBeenCalledTimes(2);
    });

    it('closes native samples when an iterator is stopped between bounded PCM copies', async () => {
        mocks.canDecode.mockResolvedValue(true);
        const sample = new AudioSample({
            data: new Float32Array(10_000).fill(0.25),
            format: 'f32-planar',
            sampleRate: 44_100,
            numberOfChannels: 1,
            timestamp: 0,
        });
        mocks.samples.mockImplementation(async function* () {
            yield sample;
        });
        const pool = createExportAudioDecodePool();
        const decoder = await createExportAudioDecoder(new Blob(), 1, undefined, pool);
        const first = await decoder.iterator.next();
        expect(first.value!.left.length).toBe(4096);
        expect(first.value!.right).toBe(first.value!.left);
        await decoder.dispose();
        expect(() => sample.copyTo(new Float32Array(1), { planeIndex: 0, frameCount: 1 })).toThrow('closed');
        expect(mocks.load).not.toHaveBeenCalled();
        await pool.dispose();
    });

    it('unmounts and deletes temporary output when decoding fails, and terminates on abort', async () => {
        const controller = new AbortController();
        const pool = createExportAudioDecodePool(controller.signal);
        mocks.exec.mockRejectedValueOnce(new Error('bad source'));
        await expect(pool.read(new Blob(), 0, 960)).rejects.toThrow('bad source');
        expect(mocks.unmount).toHaveBeenCalledWith('/source');
        expect(mocks.deleteFile).toHaveBeenCalledWith('window.pcm');
        controller.abort();
        await Promise.resolve();
        expect(mocks.terminate).toHaveBeenCalledOnce();
        await expect(pool.read(new Blob(), 0, 960)).rejects.toThrow();
        await pool.dispose();
    });
});
