import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { execVideoFFmpeg, loadVideoFFmpeg } from './video-audio-mux';

const mocks = vi.hoisted(() => ({
    load: vi.fn(),
    on: vi.fn(),
    exec: vi.fn(),
    terminate: vi.fn(),
    emitLog: undefined as ((data: { message: string }) => void) | undefined,
}));
vi.mock('@ffmpeg/ffmpeg', () => ({ FFmpeg: vi.fn(() => mocks) }));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.emitLog = undefined;
    mocks.on.mockImplementation((_event, handler) => {
        mocks.emitLog = handler;
    });
    mocks.exec.mockResolvedValue(0);
});
afterEach(() => vi.useRealTimers());

describe('video FFmpeg worker', () => {
    it('includes only recent logs from the current failed command', async () => {
        const ffmpeg = await loadVideoFFmpeg();
        mocks.emitLog?.({ message: 'Previous command error' });
        mocks.exec.mockImplementation(async () => {
            for (let line = 0; line < 12; line++) mocks.emitLog?.({ message: `log ${line}` });
            mocks.emitLog?.({ message: 'Invalid data found when processing input' });
            return 1;
        });
        const args = ['-i', 'input.wav', 'output.wav'];
        const promise = execVideoFFmpeg(ffmpeg, args);
        await expect(promise).rejects.toThrow('code 1');
        await expect(promise).rejects.toThrow('Invalid data found when processing input');
        await expect(promise).rejects.not.toThrow('log 0');
        await expect(promise).rejects.not.toThrow('Previous command error');
        expect(mocks.exec).toHaveBeenCalledWith(args);
    });

    it('terminates and clears the loading timer when WASM fails to load', async () => {
        vi.useFakeTimers();
        mocks.load.mockRejectedValueOnce(new Error('WASM unavailable'));
        await expect(loadVideoFFmpeg()).rejects.toThrow('WASM unavailable');
        expect(mocks.terminate).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('does not create a worker for an already cancelled load', async () => {
        const controller = new AbortController();
        controller.abort();
        await expect(loadVideoFFmpeg(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
        expect(FFmpeg).not.toHaveBeenCalled();
    });

    it('cancels a stalled load even when its worker ignores the abort signal', async () => {
        vi.useFakeTimers();
        mocks.load.mockImplementation(() => new Promise(() => {}));
        const controller = new AbortController();
        const loading = loadVideoFFmpeg(controller.signal);
        const cancelled = expect(loading).rejects.toMatchObject({ name: 'AbortError' });
        controller.abort();
        await cancelled;
        expect(mocks.terminate).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('times out a stalled worker and clears the timer', async () => {
        vi.useFakeTimers();
        mocks.load.mockImplementation(() => new Promise(() => {}));
        const timedOut = expect(loadVideoFFmpeg()).rejects.toThrow('loading timed out');
        await vi.advanceTimersByTimeAsync(90_000);
        await timedOut;
        expect(mocks.terminate).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('removes the loading cancellation listener after the worker is ready', async () => {
        vi.useFakeTimers();
        const controller = new AbortController();
        await loadVideoFFmpeg(controller.signal);
        controller.abort();
        expect(mocks.terminate).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });
});
