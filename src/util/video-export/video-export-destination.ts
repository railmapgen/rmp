import type { StreamTargetChunk, Target } from 'mediabunny';
import type { VideoExportFileWorkerReply, VideoExportFileWorkerRequest } from './video-export-file-worker';

export type VideoExportResult =
    | { kind: 'saved-file'; fileName: string; size: number }
    | { kind: 'temporary-file'; file: File; dispose: () => Promise<void> }
    | { kind: 'memory-blob'; blob: Blob };

export interface VideoExportDestination {
    readonly target: Target;
    complete: (mimeType: string) => Promise<VideoExportResult>;
    dispose: () => Promise<void>;
}

export type VideoExportDestinationFactory = () => Promise<VideoExportDestination>;

/** The compatibility path must never silently accumulate a multi-gigabyte file. */
export const VideoExportMemoryLimit = 64 * 1024 * 1024;
const VideoExportWriteChunkSize = 4 * 1024 * 1024;
const TemporaryDirectoryName = 'rmp-video-exports';
const StaleTemporaryFileAge = 24 * 60 * 60 * 1000;

export class VideoExportStorageError extends Error {
    constructor(message: string, cause?: unknown) {
        super(message, { cause });
        this.name = 'VideoExportStorageError';
    }
}

interface FileSink {
    write: (chunk: StreamTargetChunk) => Promise<void>;
    commit: (size: number) => Promise<void>;
    abort: () => Promise<void>;
}

const createFileSink = async (handle: FileSystemFileHandle): Promise<FileSink> => {
    const writable = await handle.createWritable({ keepExistingData: false });
    const writer = writable.getWriter();
    let closed = false;
    return {
        write: chunk => writer.write(chunk),
        async commit(size) {
            await writer.write({ type: 'truncate', size });
            await writer.close();
            closed = true;
            writer.releaseLock();
        },
        async abort() {
            if (closed) return;
            closed = true;
            try {
                await writer.abort();
            } finally {
                writer.releaseLock();
            }
        },
    };
};

/** Older OPFS implementations expose synchronous handles only inside a dedicated worker. */
const createWorkerFileSink = async (handle: FileSystemFileHandle): Promise<FileSink> => {
    if (typeof Worker === 'undefined') throw new DOMException('Storage workers are unavailable', 'NotSupportedError');
    const worker = new Worker(new URL('./video-export-file-worker.ts', import.meta.url), { type: 'module' });
    const pending = new Map<number, { resolve: () => void; reject: (error: Error) => void; timeout: number }>();
    let nextId = 0;
    let stopped = false;
    const stop = (error: Error) => {
        stopped = true;
        worker.terminate();
        for (const entry of pending.values()) {
            window.clearTimeout(entry.timeout);
            entry.reject(error);
        }
        pending.clear();
    };
    worker.onmessage = ({ data }: MessageEvent<VideoExportFileWorkerReply>) => {
        const entry = pending.get(data.id);
        if (!entry) return;
        pending.delete(data.id);
        window.clearTimeout(entry.timeout);
        if (data.error) {
            entry.reject(
                data.errorName === 'NotSupportedError'
                    ? new DOMException(data.error, data.errorName)
                    : new VideoExportStorageError(data.error)
            );
        } else entry.resolve();
    };
    worker.onerror = () => stop(new VideoExportStorageError('Video export storage worker failed'));
    const request = (operation: Omit<VideoExportFileWorkerRequest, 'id'>, transfer: Transferable[] = []) =>
        new Promise<void>((resolve, reject) => {
            if (stopped) {
                reject(new VideoExportStorageError('Video export storage worker is closed'));
                return;
            }
            const id = nextId++;
            const timeout = window.setTimeout(
                () => stop(new VideoExportStorageError('Video export storage write timed out')),
                60_000
            );
            pending.set(id, { resolve, reject, timeout });
            try {
                worker.postMessage({ ...operation, id }, transfer);
            } catch (error) {
                stop(new VideoExportStorageError('Video export storage request failed', error));
            }
        });
    try {
        await request({ type: 'open', handle });
    } catch (error) {
        stop(new VideoExportStorageError('OPFS does not support writing video files', error));
        throw error;
    }
    return {
        async write(chunk) {
            // StreamTarget may provide a view into a reusable chunk. Transfer only an owned, bounded copy.
            const data = Uint8Array.from(chunk.data);
            await request({ type: 'write', position: chunk.position, data }, [data.buffer]);
        },
        async commit(size) {
            await request({ type: 'commit', size });
            stopped = true;
            worker.terminate();
        },
        async abort() {
            if (stopped) return;
            try {
                await request({ type: 'abort' });
            } finally {
                stop(new VideoExportStorageError('Video export storage was canceled'));
            }
        },
    };
};

const createStreamDestination = async (
    sink: FileSink,
    result: (size: number, mimeType: string) => Promise<VideoExportResult>,
    removeIncomplete?: () => Promise<void>
): Promise<VideoExportDestination> => {
    const { StreamTarget } = await import('mediabunny');
    let size = 0;
    let completed = false;
    let disposed = false;
    let finalized = false;
    let writeError: VideoExportStorageError | undefined;
    // Mediabunny closes its stream on both finalize and cancel. Own the actual file transaction separately:
    // closing this forwarding stream drains writes, but only complete() may commit the user-visible file.
    const stream = new WritableStream<StreamTargetChunk>({
        async write(chunk) {
            try {
                await sink.write(chunk);
                size = Math.max(size, chunk.position + chunk.data.byteLength);
            } catch (error) {
                writeError =
                    error instanceof VideoExportStorageError
                        ? error
                        : new VideoExportStorageError('Could not write the exported video', error);
                throw writeError;
            }
        },
    });
    const target = new StreamTarget(stream, { chunked: true, chunkSize: VideoExportWriteChunkSize });
    target.on('finalized', () => {
        finalized = true;
    });
    return {
        target,
        async complete(mimeType) {
            if (disposed || completed) throw new VideoExportStorageError('Video export destination is already closed');
            if (writeError) throw writeError;
            if (!finalized) throw new VideoExportStorageError('Video export must be finalized before saving');
            try {
                await sink.commit(size);
                const exported = await result(size, mimeType);
                completed = true;
                return exported;
            } catch (error) {
                throw new VideoExportStorageError('Could not finish saving the exported video', error);
            }
        },
        async dispose() {
            if (disposed) return;
            disposed = true;
            if (!completed) {
                try {
                    await sink.abort();
                } finally {
                    await removeIncomplete?.();
                }
            }
        },
    };
};

const createMemoryDestination = async (): Promise<VideoExportDestination> => {
    const blocks: Uint8Array<ArrayBuffer>[] = [];
    return createStreamDestination(
        {
            async write({ position, data }) {
                if (position + data.byteLength > VideoExportMemoryLimit) {
                    throw new VideoExportStorageError('Video exceeds the 64 MiB limit of this browser’s memory export');
                }
                for (let offset = 0; offset < data.byteLength; ) {
                    const absoluteOffset = position + offset;
                    const index = Math.floor(absoluteOffset / VideoExportWriteChunkSize);
                    const withinBlock = absoluteOffset % VideoExportWriteChunkSize;
                    const count = Math.min(VideoExportWriteChunkSize - withinBlock, data.byteLength - offset);
                    blocks[index] ??= new Uint8Array(VideoExportWriteChunkSize);
                    blocks[index].set(data.subarray(offset, offset + count), withinBlock);
                    offset += count;
                }
            },
            async commit() {},
            async abort() {
                blocks.length = 0;
            },
        },
        async (size, mimeType) => {
            const parts = blocks.map((block, index) =>
                block.subarray(0, Math.min(VideoExportWriteChunkSize, size - index * VideoExportWriteChunkSize))
            );
            const blob = new Blob(parts, { type: mimeType });
            blocks.length = 0;
            return { kind: 'memory-blob', blob };
        }
    );
};

const removeStaleTemporaryFiles = async (directory: FileSystemDirectoryHandle) => {
    const iterable = directory as FileSystemDirectoryHandle & {
        keys?: () => AsyncIterableIterator<string>;
    };
    if (!iterable.keys) return;
    for await (const name of iterable.keys()) {
        const match = /^export-(\d+)-/.exec(name);
        if (match && Date.now() - Number(match[1]) > StaleTemporaryFileAge) {
            await directory.removeEntry(name).catch(() => undefined);
        }
    }
};

/** Default for callers outside the save dialog: use disk when available, with a small compatibility fallback. */
export const createVideoExportDestination: VideoExportDestinationFactory = async () => {
    if (typeof navigator.storage?.getDirectory !== 'function') return createMemoryDestination();
    let directory: FileSystemDirectoryHandle;
    try {
        const root = await navigator.storage.getDirectory();
        directory = await root.getDirectoryHandle(TemporaryDirectoryName, { create: true });
    } catch (error) {
        if (error instanceof DOMException && ['NotSupportedError', 'SecurityError'].includes(error.name)) {
            return createMemoryDestination();
        }
        throw new VideoExportStorageError('Could not create video export storage', error);
    }
    await removeStaleTemporaryFiles(directory).catch(() => undefined);
    const name = `export-${Date.now()}-${crypto.randomUUID()}.tmp`;
    const remove = () => directory.removeEntry(name).catch(() => undefined);
    try {
        const handle = await directory.getFileHandle(name, { create: true });
        const sink =
            typeof handle.createWritable === 'function'
                ? await createFileSink(handle)
                : await createWorkerFileSink(handle);
        return await createStreamDestination(
            sink,
            async (_size, mimeType) => {
                const file = await handle.getFile();
                // Wrap the File without materializing its bytes in JS; the browser owns the snapshot's backing store.
                const typedFile = new File([file], file.name, { type: mimeType, lastModified: file.lastModified });
                return { kind: 'temporary-file', file: typedFile, dispose: remove };
            },
            remove
        );
    } catch (error) {
        await remove();
        if (error instanceof DOMException && error.name === 'NotSupportedError') return createMemoryDestination();
        throw new VideoExportStorageError('Could not open video export storage', error);
    }
};

type VideoSavePickerWindow = Window & {
    showSaveFilePicker?: (options: {
        suggestedName: string;
        types: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<FileSystemFileHandle>;
};

/** Invoke directly from the export click, while the browser still has transient user activation. */
export const prepareVideoExportDestination = async (
    fileName: string,
    format: 'mp4' | 'webm'
): Promise<VideoExportDestinationFactory> => {
    const picker = (window as VideoSavePickerWindow).showSaveFilePicker;
    if (!picker) return createVideoExportDestination;
    const handle = await picker.call(window, {
        suggestedName: fileName,
        types: [{ description: format.toUpperCase(), accept: { [`video/${format}`]: [`.${format}`] } }],
    });
    return async () => {
        try {
            const sink = await createFileSink(handle);
            return await createStreamDestination(sink, async size => ({
                kind: 'saved-file',
                fileName: handle.name,
                size,
            }));
        } catch (error) {
            throw new VideoExportStorageError('Could not open the selected video file', error);
        }
    };
};

/** A completed temporary file stays available for large downloads; the next export removes files older than 24 h. */
export const downloadVideoExportResult = (fileName: string, result: VideoExportResult): void => {
    if (result.kind === 'saved-file') return;
    const url = URL.createObjectURL(result.kind === 'temporary-file' ? result.file : result.blob);
    const link = document.createElement('a');
    try {
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
    } finally {
        link.remove();
        // Downloads have no completion event. Release the object URL after handoff, but keep the OPFS source.
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
};
