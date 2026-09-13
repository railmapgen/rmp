import canvasSize from 'canvas-size';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getExportCanvasSize, testExportCanvasSize } from './export-canvas';

vi.mock('canvas-size', () => ({
    default: {
        test: vi.fn(),
    },
}));

beforeEach(() => {
    vi.mocked(canvasSize.test).mockReset();
});

describe('getExportCanvasSize', () => {
    it('rounds fractional scaled dimensions up to whole canvas pixels', () => {
        expect(getExportCanvasSize(10.1, 20.2, 150)).toEqual({ width: 16, height: 31 });
    });
});

describe('testExportCanvasSize', () => {
    it('tests the exact dimensions in a worker', async () => {
        const test = vi
            .mocked(canvasSize.test)
            .mockReturnValue(Promise.resolve({ success: true }) as unknown as boolean);

        await expect(testExportCanvasSize({ width: 12_345, height: 6_789 })).resolves.toBe(true);
        expect(test).toHaveBeenCalledWith({
            width: 12_345,
            height: 6_789,
            usePromise: true,
            useWorker: true,
        });
    });

    it('returns a failed asynchronous probe result', async () => {
        vi.mocked(canvasSize.test).mockReturnValue(Promise.resolve({ success: false }) as unknown as boolean);

        await expect(testExportCanvasSize({ width: 12_345, height: 6_789 })).resolves.toBe(false);
    });

    it('treats a rejected worker probe as unsupported', async () => {
        vi.mocked(canvasSize.test).mockReturnValue(
            Promise.reject(new Error('Worker unavailable')) as unknown as boolean
        );

        await expect(testExportCanvasSize({ width: 12_345, height: 6_789 })).resolves.toBe(false);
    });

    it('rejects invalid dimensions without asking canvas-size to allocate them', async () => {
        await expect(testExportCanvasSize({ width: Number.POSITIVE_INFINITY, height: 100 })).resolves.toBe(false);
        expect(canvasSize.test).not.toHaveBeenCalled();
    });
});
