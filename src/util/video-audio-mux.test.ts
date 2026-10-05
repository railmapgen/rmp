import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import type { VideoEncodingOptions } from './video-encoder';
import { loadVideoFFmpeg, mixVideoAudio, muxVideoAudio } from './video-audio-mux';

const mocks = vi.hoisted(() => ({
    load: vi.fn(),
    on: vi.fn(),
    exec: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readFile: vi.fn(),
    terminate: vi.fn(),
    files: new Map<string, Uint8Array>(),
    emitLog: undefined as ((data: { message: string }) => void) | undefined,
}));
vi.mock('@ffmpeg/ffmpeg', () => ({ FFmpeg: vi.fn(() => mocks) }));

const options: VideoEncodingOptions = { format: 'mp4', fps: 30, quality: 95, isTransparent: false };
const makeBlob = (bytes: number[], type: string) =>
    Object.assign(new Blob([new Uint8Array(bytes)], { type }), {
        arrayBuffer: async () => new Uint8Array(bytes).buffer,
    });
const video = makeBlob([1, 2, 3], 'video/mp4');
const audio = makeBlob([4, 5, 6], 'audio/mp4');
const audioOptions: VideoEncodingOptions = {
    ...options,
    audioTracks: [
        { blob: audio, start: 1.234, end: 4.234 },
        { blob: makeBlob([7, 8], 'audio/wav'), start: 0, end: 0.25 },
    ],
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.files.clear();
    mocks.emitLog = undefined;
    mocks.on.mockImplementation((_event, handler) => {
        mocks.emitLog = handler;
    });
    mocks.exec.mockResolvedValue(0);
    mocks.writeFile.mockImplementation(async (name, data) => {
        mocks.files.set(name, data);
    });
    mocks.deleteFile.mockImplementation(async name => {
        mocks.files.delete(name);
    });
    mocks.readFile.mockResolvedValue(new Uint8Array([9, 10, 11]));
});
afterEach(() => vi.useRealTimers());

describe('video audio muxing', () => {
    it('returns silent video unchanged without creating a software encoder', async () => {
        expect(await muxVideoAudio(video, options)).toBe(video);
        expect(FFmpeg).not.toHaveBeenCalled();
        expect(mocks.exec).not.toHaveBeenCalled();
    });

    it.each([
        ['mp4', 'aac'],
        ['webm', 'libopus'],
    ] as const)('mixes placed M4A and WAV clips into %s while copying video frames', async (format, codec) => {
        const result = await muxVideoAudio(video, { ...audioOptions, format });
        expect(result.type).toBe(`video/${format}`);
        expect(result.size).toBe(3);
        expect(mocks.writeFile).toHaveBeenCalledWith(`video.${format}`, new Uint8Array([1, 2, 3]));
        expect(mocks.writeFile).toHaveBeenCalledWith('audio-0.m4a', new Uint8Array([4, 5, 6]));
        expect(mocks.writeFile).toHaveBeenCalledWith('audio-1.wav', new Uint8Array([7, 8]));
        const args = mocks.exec.mock.calls[0][0] as string[];
        expect(args.slice(0, 10)).toEqual([
            '-i',
            `video.${format}`,
            '-stream_loop',
            '-1',
            '-i',
            'audio-0.m4a',
            '-stream_loop',
            '-1',
            '-i',
            'audio-1.wav',
        ]);
        const filter = args[args.indexOf('-filter_complex') + 1];
        expect(filter).toContain('[1:a]atrim=0:3,asetpts=PTS-STARTPTS,afade=t=out:st=2.5:d=0.5,adelay=1234:all=1[a0]');
        expect(filter).toContain('[2:a]atrim=0:0.25,asetpts=PTS-STARTPTS,afade=t=out:st=0:d=0.25,adelay=0:all=1[a1]');
        expect(filter).toContain('[a0][a1]amix=inputs=2:duration=longest:dropout_transition=0,apad[aout]');
        expect(args.slice(args.indexOf('-c:v'), args.indexOf('-c:v') + 4)).toEqual(['-c:v', 'copy', '-c:a', codec]);
        expect(args).toContain('-shortest');
        expect(args).not.toContain('libx264');
        expect(args).not.toContain('libvpx');
        expect(args.includes('+faststart')).toBe(format === 'mp4');
        expect(mocks.files.size).toBe(0);
        expect(mocks.terminate).toHaveBeenCalledOnce();
    });

    it('reuses an already loaded worker for software video and releases its input files', async () => {
        const ffmpeg = await loadVideoFFmpeg();
        await ffmpeg.writeFile('output.mp4', new Uint8Array([1, 2]));
        const result = await mixVideoAudio(ffmpeg, 'output.mp4', audioOptions);
        expect(result.type).toBe('video/mp4');
        expect(FFmpeg).toHaveBeenCalledOnce();
        expect(mocks.files.size).toBe(0);
        expect(mocks.terminate).not.toHaveBeenCalled();
    });

    it('includes recent FFmpeg errors and releases files and the worker after a failed mix', async () => {
        mocks.exec.mockImplementation(async () => {
            for (let line = 0; line < 12; line++) mocks.emitLog?.({ message: `log ${line}` });
            mocks.emitLog?.({ message: 'Invalid data found when processing input' });
            return 1;
        });
        const promise = muxVideoAudio(video, audioOptions);
        await expect(promise).rejects.toThrow('code 1');
        await expect(promise).rejects.toThrow('Invalid data found when processing input');
        await expect(promise).rejects.not.toThrow('log 0');
        expect(mocks.files.size).toBe(0);
        expect(mocks.terminate).toHaveBeenCalledOnce();
    });

    it('releases partial audio inputs if uploading a source fails', async () => {
        const ffmpeg = await loadVideoFFmpeg();
        await ffmpeg.writeFile('output.mp4', new Uint8Array([1, 2]));
        mocks.writeFile.mockRejectedValueOnce(new Error('Cannot store audio'));
        await expect(mixVideoAudio(ffmpeg, 'output.mp4', audioOptions)).rejects.toThrow('Cannot store audio');
        expect(mocks.deleteFile).toHaveBeenCalledWith('audio-0.m4a');
        expect(mocks.files.size).toBe(0);
        expect(mocks.exec).not.toHaveBeenCalled();
    });

    it.each([new Uint8Array(), 'not binary'])('rejects empty or nonbinary mixed output', async data => {
        mocks.readFile.mockResolvedValueOnce(data);
        await expect(muxVideoAudio(video, audioOptions)).rejects.toThrow('Audio muxing returned no output');
        expect(mocks.files.size).toBe(0);
        expect(mocks.terminate).toHaveBeenCalledOnce();
    });

    it('terminates its worker if the native video cannot be uploaded', async () => {
        mocks.writeFile.mockRejectedValueOnce(new Error('Cannot store video'));
        await expect(muxVideoAudio(video, audioOptions)).rejects.toThrow('Cannot store video');
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.terminate).toHaveBeenCalledOnce();
    });

    it('terminates and clears the loading timer when WASM fails to load', async () => {
        vi.useFakeTimers();
        mocks.load.mockRejectedValueOnce(new Error('WASM unavailable'));
        await expect(muxVideoAudio(video, audioOptions)).rejects.toThrow('WASM unavailable');
        expect(mocks.terminate).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });
});
