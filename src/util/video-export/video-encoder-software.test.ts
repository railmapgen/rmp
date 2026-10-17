import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EncodedPacket, EncodedVideoPacketSource, Input, WEBM } from 'mediabunny';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { createSoftwareVideoFrameWriter } from './video-encoder-software';
import type { VideoEncodingOptions } from './video-encoder';

const mocks = vi.hoisted(() => ({
    load: vi.fn(),
    on: vi.fn(),
    exec: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readFile: vi.fn(),
    terminate: vi.fn(),
    sourceAdd: vi.fn(),
    sourceClose: vi.fn(),
    createSession: vi.fn(),
    addAudioUntil: vi.fn(),
    complete: vi.fn(),
    dispose: vi.fn(),
    inputDispose: vi.fn(),
    getTrack: vi.fn(),
    decoderConfig: vi.fn(),
    files: new Map<string, Uint8Array>(),
    packetLists: [] as EncodedPacket[][],
    packetCount: 0,
    alpha: undefined as Uint8Array | undefined,
    activeInputs: 0,
    maxActiveInputs: 0,
    events: [] as string[],
}));
vi.mock('@ffmpeg/ffmpeg', () => ({ FFmpeg: vi.fn(() => mocks) }));
vi.mock('./video-output', () => ({ createVideoOutputSession: mocks.createSession }));
vi.mock('mediabunny', async importOriginal => {
    const actual = await importOriginal<typeof import('mediabunny')>();
    return {
        ...actual,
        EncodedVideoPacketSource: vi.fn(function () {
            return { add: mocks.sourceAdd, close: mocks.sourceClose };
        }),
        Input: vi.fn(function () {
            mocks.activeInputs++;
            mocks.maxActiveInputs = Math.max(mocks.maxActiveInputs, mocks.activeInputs);
            let disposed = false;
            return {
                getPrimaryVideoTrack: mocks.getTrack,
                dispose: () => {
                    if (disposed) return;
                    disposed = true;
                    mocks.activeInputs--;
                    mocks.inputDispose();
                },
            };
        }),
        EncodedPacketSink: vi.fn(function () {
            return {
                async *packets() {
                    const packets =
                        mocks.packetLists.shift() ??
                        Array.from(
                            { length: mocks.packetCount },
                            (_, index) =>
                                new actual.EncodedPacket(
                                    new Uint8Array([index]),
                                    index ? 'delta' : 'key',
                                    // Simulate a WebM demuxer's rounded timestamps; the writer must use the frame clock.
                                    Math.round((index / 60) * 1000) / 1000,
                                    0.017,
                                    index,
                                    undefined,
                                    mocks.alpha ? { alpha: mocks.alpha } : undefined
                                )
                        );
                    yield* packets;
                },
            };
        }),
    };
});

const options: VideoEncodingOptions = { format: 'mp4', fps: 30, quality: 95, isTransparent: false };
const result = { kind: 'saved-file', fileName: 'video.mp4', size: 4 } as const;
let canvas: HTMLCanvasElement;
beforeEach(() => {
    vi.resetAllMocks();
    mocks.files.clear();
    mocks.packetLists.length = 0;
    mocks.packetCount = 0;
    mocks.alpha = undefined;
    mocks.activeInputs = 0;
    mocks.maxActiveInputs = 0;
    mocks.events.length = 0;
    mocks.exec.mockImplementation(async (args: string[]) => {
        mocks.packetCount = Number(args[args.indexOf('-frames:v') + 1]);
        mocks.files.set(args[args.length - 1], new Uint8Array([0, 1, 2, 3]));
        return 0;
    });
    mocks.writeFile.mockImplementation(async (name, data) => {
        mocks.files.set(name, data);
    });
    mocks.deleteFile.mockImplementation(async name => {
        mocks.files.delete(name);
    });
    mocks.readFile.mockResolvedValue(new Uint8Array([0, 1, 2, 3]));
    mocks.terminate.mockImplementation(() => mocks.files.clear());
    mocks.decoderConfig.mockResolvedValue({ codec: 'avc1.42c01f', codedWidth: 320, codedHeight: 180 });
    mocks.getTrack.mockResolvedValue({ getDecoderConfig: mocks.decoderConfig });
    mocks.createSession.mockResolvedValue({
        addAudioUntil: mocks.addAudioUntil,
        complete: mocks.complete,
        dispose: mocks.dispose,
    });
    mocks.addAudioUntil.mockImplementation(async time => {
        mocks.events.push(`audio:${time}`);
    });
    mocks.sourceAdd.mockImplementation(async (packet: EncodedPacket) => {
        mocks.events.push(`video:${packet.timestamp}`);
    });
    mocks.complete.mockResolvedValue(result);
    canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    vi.spyOn(canvas, 'toBlob').mockImplementation(callback =>
        callback({ size: 4, arrayBuffer: async () => new ArrayBuffer(4) } as Blob)
    );
});
afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

const useSingleFrameBatches = () => {
    canvas.width = 3840;
    canvas.height = 2160;
};

describe('streaming software video encoding', () => {
    it.each([30, 60])('drains each PNG batch into the output at exact absolute %i FPS timestamps', async fps => {
        const writer = await createSoftwareVideoFrameWriter(canvas, { ...options, fps });
        for (let frame = 0; frame < 31; frame++) await writer.addFrame(frame);
        expect(mocks.sourceAdd).toHaveBeenCalledTimes(30);
        expect([...mocks.files.keys()]).toEqual(['frame-000000.png']);
        expect(await writer.complete()).toBe(result);
        expect(mocks.complete).toHaveBeenCalledWith(31 / fps);
        expect(mocks.exec).toHaveBeenCalledTimes(2);
        expect(mocks.exec.mock.calls[0][0]).toEqual(
            expect.arrayContaining(['libx264', '-profile:v', 'baseline', '-level:v', '3.1', '-bf', '0'])
        );
        expect(mocks.exec.mock.calls.every(([args]) => !args.includes('concat') && !args.includes('copy'))).toBe(true);
        const packets = mocks.sourceAdd.mock.calls.map(([packet]) => packet as EncodedPacket);
        expect(packets).toHaveLength(31);
        packets.forEach((packet, frame) => {
            expect(packet.timestamp).toBe(frame / fps);
            expect(packet.timestamp + packet.duration).toBe((frame + 1) / fps);
            expect(packet.sequenceNumber).toBe(frame);
        });
        expect(mocks.files.size).toBe(0);
        expect(mocks.inputDispose).toHaveBeenCalledTimes(2);
        expect(mocks.maxActiveInputs).toBe(1);
        expect(mocks.activeInputs).toBe(0);
        expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
        await writer.dispose();
        await writer.dispose();
        expect(mocks.terminate).toHaveBeenCalledOnce();
        expect(mocks.dispose).toHaveBeenCalledOnce();
        expect(mocks.sourceClose).toHaveBeenCalledOnce();
    });

    it('keeps only one 4K batch and preserves VP8 alpha side data when remuxing', async () => {
        useSingleFrameBatches();
        mocks.alpha = new Uint8Array([9, 8, 7]);
        mocks.decoderConfig.mockResolvedValue({ codec: 'vp8', codedWidth: 3840, codedHeight: 2160 });
        const writer = await createSoftwareVideoFrameWriter(canvas, {
            ...options,
            format: 'webm',
            isTransparent: true,
        });
        await writer.addFrame(0);
        expect(mocks.files.size).toBe(0);
        expect(mocks.exec.mock.calls[0][0]).toEqual(
            expect.arrayContaining(['libvpx', 'yuva420p', '-auto-alt-ref', '0'])
        );
        expect(EncodedVideoPacketSource).toHaveBeenCalledWith('vp8');
        expect(Input).toHaveBeenCalledWith(expect.objectContaining({ formats: [WEBM] }));
        expect((mocks.sourceAdd.mock.calls[0][0] as EncodedPacket).sideData.alpha).toBe(mocks.alpha);
        await writer.complete();
        await writer.dispose();
    });

    it('copies only the decoder header and rejects a configuration change between independent batches', async () => {
        useSingleFrameBatches();
        const backing = new Uint8Array(4096);
        backing.set([1, 2], 100);
        mocks.decoderConfig
            .mockResolvedValueOnce({ codec: 'avc1.42c01f', description: backing.subarray(100, 102) })
            .mockResolvedValueOnce({ codec: 'avc1.42c01f', description: new Uint8Array([1, 3]) });
        const writer = await createSoftwareVideoFrameWriter(canvas, options);
        await writer.addFrame(0);
        const description = mocks.sourceAdd.mock.calls[0][1].decoderConfig.description as Uint8Array;
        expect(description).toEqual(new Uint8Array([1, 2]));
        expect(description.buffer.byteLength).toBe(2);
        await expect(writer.addFrame(1)).rejects.toThrow('changed its decoder configuration');
        expect(mocks.files.size).toBe(0);
        expect(mocks.activeInputs).toBe(0);
        await writer.dispose();
    });

    it('awaits output backpressure and interleaves audio around every submitted packet', async () => {
        useSingleFrameBatches();
        let acceptPacket!: () => void;
        mocks.sourceAdd.mockImplementationOnce(
            (packet: EncodedPacket) =>
                new Promise<void>(resolve => {
                    mocks.events.push(`video:${packet.timestamp}`);
                    acceptPacket = resolve;
                })
        );
        const audioTracks = [{ blob: new Blob(['audio']), start: 0, end: 1 }];
        const writer = await createSoftwareVideoFrameWriter(canvas, { ...options, audioTracks });
        let frameResolved = false;
        const pending = writer.addFrame(0).then(() => {
            frameResolved = true;
        });
        await vi.waitFor(() => expect(mocks.sourceAdd).toHaveBeenCalledOnce());
        expect(frameResolved).toBe(false);
        expect(mocks.events).toEqual(['audio:0', 'video:0']);
        expect(mocks.files.size).toBe(0);
        acceptPacket();
        await pending;
        expect(mocks.events).toEqual(['audio:0', 'video:0', `audio:${1 / 30}`]);
        expect(mocks.createSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ audioTracks }));
        expect(mocks.exec.mock.calls[0][0]).not.toContain('-filter_complex');
        await writer.complete();
        await writer.dispose();
    });

    it('recycles the WASM worker without restarting the output or retaining completed segments', async () => {
        useSingleFrameBatches();
        const writer = await createSoftwareVideoFrameWriter(canvas, options);
        for (let frame = 0; frame < 130; frame++) {
            await writer.addFrame(frame);
            expect(mocks.files.size).toBe(0);
        }
        expect(FFmpeg).toHaveBeenCalledTimes(3);
        expect(mocks.terminate).toHaveBeenCalledTimes(2);
        expect(mocks.createSession).toHaveBeenCalledOnce();
        expect((mocks.sourceAdd.mock.calls[129][0] as EncodedPacket).timestamp).toBe(129 / 30);
        await writer.complete();
        await writer.dispose();
        expect(mocks.terminate).toHaveBeenCalledTimes(3);
    });

    it('deletes partial PNGs and the segment when FFmpeg fails', async () => {
        const writer = await createSoftwareVideoFrameWriter(canvas, options);
        await writer.addFrame(0);
        mocks.exec.mockResolvedValueOnce(1);
        await expect(writer.complete()).rejects.toThrow('code 1');
        expect(mocks.files.size).toBe(0);
        expect(mocks.complete).not.toHaveBeenCalled();
        await writer.dispose();
    });

    it.each([new Uint8Array(), 'not binary'])('rejects missing segment bytes and clears the batch', async data => {
        useSingleFrameBatches();
        mocks.readFile.mockResolvedValueOnce(data);
        const writer = await createSoftwareVideoFrameWriter(canvas, options);
        await expect(writer.addFrame(0)).rejects.toThrow('Video encoder returned no output');
        expect(mocks.files.size).toBe(0);
        await writer.dispose();
    });

    it.each([
        ['an incomplete batch', []],
        ['too many frames', [0, 1]],
    ])('rejects %s and disposes its demuxer', async (_label, frames) => {
        useSingleFrameBatches();
        mocks.packetLists.push(
            (frames as number[]).map(index => new EncodedPacket(new Uint8Array([0]), 'key', index, 1))
        );
        const writer = await createSoftwareVideoFrameWriter(canvas, options);
        await expect(writer.addFrame(0)).rejects.toThrow(/incomplete batch|too many frames/);
        expect(mocks.files.size).toBe(0);
        expect(mocks.activeInputs).toBe(0);
        await writer.dispose();
    });

    it('rejects a batch that depends on a previous worker encoder state', async () => {
        useSingleFrameBatches();
        mocks.packetLists.push([new EncodedPacket(new Uint8Array([0]), 'delta', 0, 1)]);
        const writer = await createSoftwareVideoFrameWriter(canvas, options);
        await expect(writer.addFrame(0)).rejects.toThrow('begin with a key frame');
        expect(mocks.sourceAdd).not.toHaveBeenCalled();
        await writer.dispose();
    });

    it('reports a missing PNG before uploading corrupt data', async () => {
        vi.mocked(canvas.toBlob).mockImplementation(callback => callback(null));
        const writer = await createSoftwareVideoFrameWriter(canvas, options);
        await expect(writer.addFrame(0)).rejects.toThrow('Could not encode video frame');
        expect(mocks.writeFile).not.toHaveBeenCalled();
        await writer.dispose();
    });

    it('releases the partial batch, source and output when disposed before completion', async () => {
        const writer = await createSoftwareVideoFrameWriter(canvas, options);
        await writer.addFrame(0);
        expect(mocks.files.size).toBe(1);
        await writer.dispose();
        expect(mocks.files.size).toBe(0);
        expect(mocks.dispose).toHaveBeenCalledOnce();
        expect(mocks.sourceClose).toHaveBeenCalledOnce();
        await expect(writer.addFrame(1)).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('cancels a pending canvas PNG without uploading a late callback', async () => {
        const controller = new AbortController();
        let finishPng!: BlobCallback;
        vi.mocked(canvas.toBlob).mockImplementation(callback => {
            finishPng = callback;
        });
        const writer = await createSoftwareVideoFrameWriter(canvas, { ...options, signal: controller.signal });
        const frame = writer.addFrame(0);
        const cancelled = expect(frame).rejects.toMatchObject({ name: 'AbortError' });
        await vi.waitFor(() => expect(canvas.toBlob).toHaveBeenCalledOnce());
        controller.abort();
        await cancelled;
        finishPng(new Blob(['late PNG']));
        await Promise.resolve();
        expect(mocks.writeFile).not.toHaveBeenCalled();
        await writer.dispose();
    });

    it('cancels an active FFmpeg batch and disposes the destination', async () => {
        useSingleFrameBatches();
        const controller = new AbortController();
        let rejectExec!: (reason: unknown) => void;
        mocks.exec.mockImplementationOnce(
            () =>
                new Promise((_resolve, reject) => {
                    rejectExec = reject;
                })
        );
        mocks.terminate.mockImplementation(() => {
            mocks.files.clear();
            rejectExec?.(new Error('Worker terminated'));
        });
        const writer = await createSoftwareVideoFrameWriter(canvas, { ...options, signal: controller.signal });
        const frame = writer.addFrame(0);
        const cancelled = expect(frame).rejects.toMatchObject({ name: 'AbortError' });
        await vi.waitFor(() => expect(mocks.exec).toHaveBeenCalledOnce());
        controller.abort();
        await cancelled;
        await writer.dispose();
        expect(mocks.terminate).toHaveBeenCalledOnce();
        expect(mocks.dispose).toHaveBeenCalledOnce();
        expect(mocks.files.size).toBe(0);
    });

    it('disposes an already opened destination when the software encoder cannot load', async () => {
        mocks.load.mockRejectedValueOnce(new Error('WASM unavailable'));
        await expect(createSoftwareVideoFrameWriter(canvas, options)).rejects.toThrow('WASM unavailable');
        expect(mocks.terminate).toHaveBeenCalledOnce();
        expect(mocks.dispose).toHaveBeenCalledOnce();
    });

    it('does not finalize an export with no frames', async () => {
        const writer = await createSoftwareVideoFrameWriter(canvas, options);
        await expect(writer.complete()).rejects.toThrow('No video frames to encode');
        expect(mocks.complete).not.toHaveBeenCalled();
        await writer.dispose();
    });
});
