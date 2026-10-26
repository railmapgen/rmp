export interface VideoExportFileWorkerRequest {
    id: number;
    type: 'open' | 'write' | 'commit' | 'abort';
    handle?: FileSystemFileHandle;
    position?: number;
    data?: Uint8Array<ArrayBuffer>;
    size?: number;
}

export interface VideoExportFileWorkerReply {
    id: number;
    error?: string;
    errorName?: string;
}

interface SyncFileHandle {
    write: (data: Uint8Array<ArrayBuffer>, options: { at: number }) => number;
    truncate: (size: number) => void;
    flush: () => void;
    close: () => void;
}

const worker = self as unknown as {
    onmessage: ((event: MessageEvent<VideoExportFileWorkerRequest>) => void) | null;
    postMessage: (reply: VideoExportFileWorkerReply) => void;
};
let file: SyncFileHandle | undefined;
let queue = Promise.resolve();

worker.onmessage = ({ data: message }) => {
    queue = queue.then(async () => {
        try {
            if (message.type === 'open') {
                const handle = message.handle as FileSystemFileHandle & {
                    createSyncAccessHandle?: () => Promise<SyncFileHandle>;
                };
                if (!handle?.createSyncAccessHandle)
                    throw new DOMException('OPFS synchronous writing is unavailable', 'NotSupportedError');
                file = await handle.createSyncAccessHandle();
                file.truncate(0);
            } else if (message.type === 'write') {
                if (!file || !message.data || message.position === undefined) throw new Error('Video file is not open');
                let written = 0;
                while (written < message.data.byteLength) {
                    const count = file.write(message.data.subarray(written), { at: message.position + written });
                    if (count <= 0) throw new Error('Video storage is full');
                    written += count;
                }
            } else if (message.type === 'commit') {
                if (!file || message.size === undefined) throw new Error('Video file is not open');
                file.truncate(message.size);
                file.flush();
                file.close();
                file = undefined;
            } else {
                file?.close();
                file = undefined;
            }
            worker.postMessage({ id: message.id });
        } catch (error) {
            worker.postMessage({
                id: message.id,
                error: error instanceof Error || error instanceof DOMException ? error.message : String(error),
                errorName: error instanceof Error || error instanceof DOMException ? error.name : undefined,
            });
        }
    });
};
