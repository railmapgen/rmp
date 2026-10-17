import type { StreamTargetChunk } from 'mediabunny';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VideoExportDestination } from './video-export-destination';
import type { VideoExportFileWorkerReply, VideoExportFileWorkerRequest } from './video-export-file-worker';
import {
    createVideoExportDestination,
    downloadVideoExportResult,
    prepareVideoExportDestination,
    VideoExportMemoryLimit,
    VideoExportStorageError,
} from './video-export-destination';

interface TestTarget {
    _start: () => void;
    _write: (data: Uint8Array, position: number) => void;
    _flush: () => Promise<void>;
    _finalize: () => Promise<void>;
    _close: () => Promise<void>;
}
const targetOf = (destination: VideoExportDestination) => destination.target as unknown as TestTarget;

const createFile = () => {
    const writes: StreamTargetChunk[] = [];
    const write = vi.fn(async (chunk: StreamTargetChunk | { type: 'truncate'; size: number }) => {
        if (chunk.type === 'write') writes.push(chunk);
    });
    const close = vi.fn();
    const abort = vi.fn();
    const createWritable = vi.fn(async () => new WritableStream({ write, close, abort }));
    const handle = {
        name: 'selected.mp4',
        createWritable,
        getFile: vi.fn(async () => new File(['file contents'], 'temporary.tmp')),
    } as unknown as FileSystemFileHandle;
    return { handle, createWritable, write, close, abort, writes };
};

const setupOPFS = (handle: FileSystemFileHandle) => {
    const removeEntry = vi.fn(async () => undefined);
    const directory = {
        getFileHandle: vi.fn(async () => handle),
        removeEntry,
        keys: async function* (): AsyncGenerator<string> {},
    };
    const root = { getDirectoryHandle: vi.fn(async () => directory) };
    Object.defineProperty(navigator, 'storage', {
        configurable: true,
        value: { getDirectory: vi.fn(async () => root) },
    });
    return { directory, root, removeEntry };
};

beforeEach(() => {
    Object.defineProperty(navigator, 'storage', { configurable: true, value: {} });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker;
});

describe('video export destinations', () => {
    it('commits a selected file only after successful finalization, with a fresh stream for every attempt', async () => {
        const file = createFile();
        const picker = vi.fn(async () => file.handle);
        Object.assign(window, { showSaveFilePicker: picker });
        const factoryPromise = prepareVideoExportDestination('Timeline.mp4', 'mp4');
        // The picker runs synchronously within the original click, before any import or rendering await.
        expect(picker).toHaveBeenCalledExactlyOnceWith({
            suggestedName: 'Timeline.mp4',
            types: [{ description: 'MP4', accept: { 'video/mp4': ['.mp4'] } }],
        });
        const factory = await factoryPromise;
        const destination = await factory();
        targetOf(destination)._start();
        targetOf(destination)._write(new Uint8Array([1, 2, 3]), 0);
        await targetOf(destination)._flush();
        await targetOf(destination)._finalize();
        expect(file.close).not.toHaveBeenCalled();
        expect(await destination.complete('video/mp4')).toEqual({
            kind: 'saved-file',
            fileName: 'selected.mp4',
            size: 3,
        });
        await destination.dispose();
        expect(file.close).toHaveBeenCalledOnce();
        expect(file.abort).not.toHaveBeenCalled();
        const retry = await factory();
        expect(file.createWritable).toHaveBeenCalledTimes(2);
        expect(file.createWritable).toHaveBeenLastCalledWith({ keepExistingData: false });
        await retry.dispose();
    });

    it('aborts a canceled stream instead of committing a partial file', async () => {
        const file = createFile();
        Object.assign(window, { showSaveFilePicker: vi.fn(async () => file.handle) });
        const destination = await (await prepareVideoExportDestination('Timeline.mp4', 'mp4'))();
        targetOf(destination)._start();
        targetOf(destination)._write(new Uint8Array([1]), 0);
        await targetOf(destination)._flush();
        // Output.cancel() invokes Target._close(), which would commit if the actual file stream were used directly.
        await targetOf(destination)._close();
        await destination.dispose();
        await destination.dispose();
        expect(file.close).not.toHaveBeenCalled();
        expect(file.abort).toHaveBeenCalledOnce();
        await expect(destination.complete('video/mp4')).rejects.toBeInstanceOf(VideoExportStorageError);
    });

    it('refuses to commit a file that has not finalized', async () => {
        const file = createFile();
        Object.assign(window, { showSaveFilePicker: vi.fn(async () => file.handle) });
        const destination = await (await prepareVideoExportDestination('Timeline.mp4', 'mp4'))();
        await expect(destination.complete('video/mp4')).rejects.toThrow('finalized');
        expect(file.close).not.toHaveBeenCalled();
        await destination.dispose();
        expect(file.abort).toHaveBeenCalledOnce();
    });

    it('preserves random-access writes needed by ordinary MP4', async () => {
        const file = createFile();
        Object.assign(window, { showSaveFilePicker: vi.fn(async () => file.handle) });
        const destination = await (await prepareVideoExportDestination('Timeline.mp4', 'mp4'))();
        targetOf(destination)._start();
        targetOf(destination)._write(new Uint8Array([1, 2, 3]), 0);
        await targetOf(destination)._flush();
        targetOf(destination)._write(new Uint8Array([7]), 0);
        await targetOf(destination)._flush();
        await targetOf(destination)._finalize();
        expect(file.writes.at(-1)).toMatchObject({ type: 'write', position: 0 });
        expect(Array.from(file.writes.at(-1)!.data)).toEqual([7, 2, 3]);
        expect((await destination.complete('video/mp4')).kind).toBe('saved-file');
        await destination.dispose();
    });

    it('waits for the actual disk write before finalization and commit', async () => {
        const file = createFile();
        let release!: () => void;
        file.write.mockImplementationOnce(() => new Promise<void>(resolve => (release = resolve)));
        Object.assign(window, { showSaveFilePicker: vi.fn(async () => file.handle) });
        const destination = await (await prepareVideoExportDestination('Timeline.mp4', 'mp4'))();
        targetOf(destination)._start();
        targetOf(destination)._write(new Uint8Array([1]), 0);
        await targetOf(destination)._flush();
        let finalized = false;
        const finalization = targetOf(destination)
            ._finalize()
            .then(() => (finalized = true));
        await vi.waitFor(() => expect(file.write).toHaveBeenCalledOnce());
        expect(finalized).toBe(false);
        expect(file.close).not.toHaveBeenCalled();
        release();
        await finalization;
        await destination.complete('video/mp4');
        expect(file.close).toHaveBeenCalledOnce();
        await destination.dispose();
    });

    it('keeps a completed OPFS file until its consumer releases it', async () => {
        const file = createFile();
        const { removeEntry } = setupOPFS(file.handle);
        const destination = await createVideoExportDestination();
        targetOf(destination)._start();
        targetOf(destination)._write(new Uint8Array([1]), 0);
        await targetOf(destination)._flush();
        await targetOf(destination)._finalize();
        const result = await destination.complete('video/webm');
        await destination.dispose();
        expect(result.kind).toBe('temporary-file');
        expect(removeEntry).not.toHaveBeenCalled();
        if (result.kind !== 'temporary-file') throw new Error('Expected a temporary file');
        expect(result.file.type).toBe('video/webm');
        expect(result.file.size).toBe(13);
        await result.dispose();
        expect(removeEntry).toHaveBeenCalledOnce();
    });

    it('deletes a failed OPFS export without committing it', async () => {
        const file = createFile();
        const { removeEntry } = setupOPFS(file.handle);
        const destination = await createVideoExportDestination();
        await destination.dispose();
        expect(file.close).not.toHaveBeenCalled();
        expect(file.abort).toHaveBeenCalledOnce();
        expect(removeEntry).toHaveBeenCalledOnce();
    });

    it('does not turn quota errors into an unlimited memory export', async () => {
        const file = createFile();
        setupOPFS(file.handle);
        file.createWritable.mockRejectedValueOnce(new DOMException('Disk is full', 'QuotaExceededError'));
        await expect(createVideoExportDestination()).rejects.toBeInstanceOf(VideoExportStorageError);
    });

    it('uses an OPFS worker when createWritable is unavailable', async () => {
        const messages: VideoExportFileWorkerRequest[] = [];
        const terminate = vi.fn();
        const handle = { getFile: vi.fn(async () => new File(['worker video'], 'worker.tmp')) };
        const { removeEntry } = setupOPFS(handle as unknown as FileSystemFileHandle);
        vi.stubGlobal(
            'Worker',
            class {
                onmessage?: (event: MessageEvent<VideoExportFileWorkerReply>) => void;
                terminate = terminate;
                postMessage(message: VideoExportFileWorkerRequest) {
                    messages.push(message);
                    queueMicrotask(() => this.onmessage?.({ data: { id: message.id } } as MessageEvent));
                }
            }
        );
        const destination = await createVideoExportDestination();
        const target = targetOf(destination);
        target._start();
        target._write(new Uint8Array([1, 2, 3]), 0);
        await target._flush();
        await target._finalize();
        expect(messages.map(message => message.type)).toEqual(['open', 'write']);
        expect(messages[1]).toMatchObject({ position: 0, data: new Uint8Array([1, 2, 3]) });
        const result = await destination.complete('video/mp4');
        await destination.dispose();
        expect(result.kind).toBe('temporary-file');
        expect(messages.at(-1)).toMatchObject({ type: 'commit', size: 3 });
        expect(terminate).toHaveBeenCalledOnce();
        expect(removeEntry).not.toHaveBeenCalled();
        if (result.kind === 'temporary-file') await result.dispose();
        expect(removeEntry).toHaveBeenCalledOnce();
    });

    it('uses the capped memory fallback when neither OPFS writing interface is supported', async () => {
        const terminate = vi.fn();
        const { removeEntry } = setupOPFS({} as FileSystemFileHandle);
        vi.stubGlobal(
            'Worker',
            class {
                onmessage?: (event: MessageEvent<VideoExportFileWorkerReply>) => void;
                terminate = terminate;
                postMessage(message: VideoExportFileWorkerRequest) {
                    queueMicrotask(() =>
                        this.onmessage?.({
                            data: { id: message.id, error: 'Unsupported', errorName: 'NotSupportedError' },
                        } as MessageEvent)
                    );
                }
            }
        );
        const destination = await createVideoExportDestination();
        targetOf(destination)._start();
        targetOf(destination)._write(new Uint8Array([1]), 0);
        await targetOf(destination)._flush();
        await targetOf(destination)._finalize();
        expect((await destination.complete('video/mp4')).kind).toBe('memory-blob');
        await destination.dispose();
        expect(terminate).toHaveBeenCalledOnce();
        expect(removeEntry).toHaveBeenCalledOnce();
    });

    it('falls back to a capped memory file when OPFS is unavailable', async () => {
        const destination = await createVideoExportDestination();
        targetOf(destination)._start();
        targetOf(destination)._write(new Uint8Array([1, 2, 3]), 0);
        await targetOf(destination)._flush();
        await targetOf(destination)._finalize();
        const result = await destination.complete('video/mp4');
        expect(result.kind).toBe('memory-blob');
        if (result.kind !== 'memory-blob') throw new Error('Expected a memory result');
        expect(result.blob.size).toBe(3);
        expect(result.blob.type).toBe('video/mp4');
        await destination.dispose();
        expect(result.blob.size).toBe(3);
    });

    it('rejects a memory output beyond 64 MiB instead of continuing to grow', async () => {
        const destination = await createVideoExportDestination();
        const target = targetOf(destination);
        target._start();
        const chunk = new Uint8Array(4 * 1024 * 1024);
        const encode = async () => {
            for (let position = 0; position <= VideoExportMemoryLimit; position += chunk.byteLength) {
                target._write(chunk, position);
                await target._flush();
            }
            await target._finalize();
        };
        await expect(encode()).rejects.toThrow('64 MiB');
        await destination.dispose();
    });

    it('propagates a canceled save picker without starting a fallback destination', async () => {
        const cancel = new DOMException('Canceled', 'AbortError');
        Object.assign(window, { showSaveFilePicker: vi.fn().mockRejectedValue(cancel) });
        await expect(prepareVideoExportDestination('Timeline.mp4', 'mp4')).rejects.toBe(cancel);
    });

    it('cleans only old video temporary files, leaving recent or unrelated files alone', async () => {
        const file = createFile();
        const { directory, removeEntry } = setupOPFS(file.handle);
        const oldName = `export-${Date.now() - 25 * 60 * 60 * 1000}-old.tmp`;
        directory.keys = async function* () {
            yield oldName;
            yield `export-${Date.now()}-active.tmp`;
            yield 'unrelated.tmp';
        };
        const destination = await createVideoExportDestination();
        expect(removeEntry).toHaveBeenCalledExactlyOnceWith(oldName);
        await destination.dispose();
    });

    it('hands off a file download without reading it into memory or deleting its source', () => {
        vi.useFakeTimers();
        const createURL = vi.fn(() => 'blob:video');
        const revoke = vi.fn();
        vi.stubGlobal('URL', { createObjectURL: createURL, revokeObjectURL: revoke });
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        const file = new File(['video'], 'video.mp4');
        const dispose = vi.fn();
        downloadVideoExportResult('Timeline.mp4', { kind: 'temporary-file', file, dispose });
        expect(createURL).toHaveBeenCalledExactlyOnceWith(file);
        expect(click).toHaveBeenCalledOnce();
        expect(dispose).not.toHaveBeenCalled();
        expect(revoke).not.toHaveBeenCalled();
        vi.advanceTimersByTime(60_000);
        expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:video');
        expect(dispose).not.toHaveBeenCalled();
    });

    it('does not download an already saved result a second time', () => {
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
        downloadVideoExportResult('Timeline.mp4', { kind: 'saved-file', fileName: 'Timeline.mp4', size: 42 });
        expect(click).not.toHaveBeenCalled();
    });
});
