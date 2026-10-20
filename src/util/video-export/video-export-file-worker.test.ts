import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VideoExportFileWorkerReply, VideoExportFileWorkerRequest } from './video-export-file-worker';

const loadWorker = async () => {
    vi.resetModules();
    const scope = {
        onmessage: undefined as ((event: MessageEvent<VideoExportFileWorkerRequest>) => void) | undefined,
        postMessage: vi.fn<(message: VideoExportFileWorkerReply) => void>(),
    };
    vi.stubGlobal('self', scope);
    await import('./video-export-file-worker');
    return {
        scope,
        send: (data: VideoExportFileWorkerRequest) => scope.onmessage!({ data } as MessageEvent),
    };
};

afterEach(() => vi.unstubAllGlobals());

describe('video export OPFS worker', () => {
    it('serializes initialization and positional writes, handles partial writes, and flushes before closing', async () => {
        const { scope, send } = await loadWorker();
        const operations: string[] = [];
        const write = vi.fn((data: Uint8Array, { at }: { at: number }) => {
            operations.push(`write:${at}`);
            return Math.min(2, data.byteLength);
        });
        const truncate = vi.fn((size: number) => operations.push(`truncate:${size}`));
        const flush = vi.fn(() => operations.push('flush'));
        const close = vi.fn(() => operations.push('close'));
        send({
            id: 1,
            type: 'open',
            handle: {
                createSyncAccessHandle: async () => ({ write, truncate, flush, close }),
            } as unknown as FileSystemFileHandle,
        });
        send({ id: 2, type: 'write', data: new Uint8Array([1, 2, 3, 4, 5]), position: 10 });
        send({ id: 3, type: 'commit', size: 15 });
        await vi.waitFor(() => expect(scope.postMessage).toHaveBeenCalledTimes(3));
        expect(operations).toEqual(['truncate:0', 'write:10', 'write:12', 'write:14', 'truncate:15', 'flush', 'close']);
        expect(scope.postMessage.mock.calls).toEqual([[{ id: 1 }], [{ id: 2 }], [{ id: 3 }]]);
    });

    it('reports unsupported synchronous OPFS so the caller can use its bounded compatibility path', async () => {
        const { scope, send } = await loadWorker();
        send({ id: 1, type: 'open', handle: {} as FileSystemFileHandle });
        await vi.waitFor(() =>
            expect(scope.postMessage).toHaveBeenCalledWith({
                id: 1,
                error: 'OPFS synchronous writing is unavailable',
                errorName: 'NotSupportedError',
            })
        );
    });

    it('reports a zero-byte write as storage exhaustion and closes on abort without committing', async () => {
        const { scope, send } = await loadWorker();
        const flush = vi.fn();
        const close = vi.fn();
        const truncate = vi.fn();
        send({
            id: 1,
            type: 'open',
            handle: {
                createSyncAccessHandle: async () => ({ write: () => 0, truncate, flush, close }),
            } as unknown as FileSystemFileHandle,
        });
        send({ id: 2, type: 'write', data: new Uint8Array([1]), position: 0 });
        send({ id: 3, type: 'abort' });
        await vi.waitFor(() => expect(scope.postMessage).toHaveBeenCalledTimes(3));
        expect(scope.postMessage).toHaveBeenCalledWith({ id: 2, error: 'Video storage is full', errorName: 'Error' });
        expect(close).toHaveBeenCalledOnce();
        expect(flush).not.toHaveBeenCalled();
        expect(truncate).toHaveBeenCalledExactlyOnceWith(0);
    });
});
