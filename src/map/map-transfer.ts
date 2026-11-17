import { localMapStore, notifyMapLibraryChanged } from './local-map';

/** Same-origin RMW/RMP transport. Keep the copy in RMP in sync. */
export const MAP_TRANSFER_CHANNEL = 'rmw-rmp-map-import-v1';
const PROTOCOL = 'rmw-rmp-map-v1';
const READY_TIMEOUT = 30_000;
const IMPORT_TIMEOUT = 120_000;
type Role = 'rmw' | 'rmp';
type Message = {
    protocol: typeof PROTOCOL;
    type: 'DISCOVER' | 'AVAILABLE' | 'EXPORT' | 'PACKAGE' | 'RESULT' | 'CANCEL';
    transferId: string;
    senderId: string;
    targetId?: string;
    role?: Role;
    lastActiveAt?: number;
    blob?: Blob;
    error?: string;
    ok?: boolean;
};
const channel = () => {
    if (typeof BroadcastChannel === 'undefined')
        throw new Error('Map transfer requires BroadcastChannel. Download a .rmpmap file instead.');
    return new BroadcastChannel(MAP_TRANSFER_CHANNEL);
};
const validMessage = (data: unknown): data is Message => {
    if (!data || typeof data !== 'object') return false;
    const value = data as Message;
    return value.protocol === PROTOCOL && typeof value.transferId === 'string' && typeof value.senderId === 'string';
};
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Registers an app instance without sharing any project or editor state. */
export function registerMapTransferEndpoint(options: {
    role: Role;
    exportPackage?: () => Promise<Blob>;
    importPackage?: (blob: Blob) => Promise<unknown>;
    bridgeId?: string;
    onResult?: (error?: string) => void;
}) {
    const port = channel();
    const instanceId = crypto.randomUUID();
    let lastActiveAt = document.hasFocus() ? Date.now() : 0;
    let closed = false;
    let exporting = false;
    const jobs = new Map<string, Promise<void>>();
    const cancelled = new Set<string>();
    const active = () => {
        lastActiveAt = Date.now();
    };
    window.addEventListener('focus', active);
    window.addEventListener('pointerdown', active);
    window.addEventListener('keydown', active);
    const send = (message: Omit<Message, 'protocol' | 'senderId'>) => {
        if (!closed) port.postMessage({ ...message, protocol: PROTOCOL, senderId: instanceId });
    };
    port.onmessage = ({ data }: MessageEvent<unknown>) => {
        if (closed || !validMessage(data) || (options.bridgeId && data.transferId !== options.bridgeId)) return;
        if (data.type === 'DISCOVER' && data.role === options.role) {
            send({
                type: 'AVAILABLE',
                transferId: data.transferId,
                targetId: data.senderId,
                role: options.role,
                lastActiveAt,
            });
            return;
        }
        if (data.targetId !== instanceId) return;
        if (data.type === 'CANCEL') {
            cancelled.add(data.transferId);
            return;
        }
        if (cancelled.has(data.transferId)) return;
        if (data.type === 'RESULT' && options.role === 'rmw') {
            options.onResult?.(data.ok ? undefined : (data.error ?? 'Map import failed'));
            return;
        }
        if (jobs.has(data.transferId)) return;
        if (data.type === 'EXPORT' && options.role === 'rmw' && options.exportPackage) {
            const task = (async () => {
                let ownsExport = false;
                try {
                    if (exporting) throw new Error('RMW is already exporting a map. Try again when it finishes.');
                    exporting = true;
                    ownsExport = true;
                    const blob = await options.exportPackage!();
                    if (!cancelled.has(data.transferId))
                        send({ type: 'PACKAGE', transferId: data.transferId, targetId: data.senderId, blob });
                } catch (error) {
                    send({
                        type: 'RESULT',
                        transferId: data.transferId,
                        targetId: data.senderId,
                        ok: false,
                        error: errorMessage(error),
                    });
                } finally {
                    if (ownsExport) exporting = false;
                }
            })();
            jobs.set(data.transferId, task);
        } else if (
            data.type === 'PACKAGE' &&
            options.role === 'rmp' &&
            options.importPackage &&
            data.blob instanceof Blob
        ) {
            const task = (async () => {
                try {
                    await options.importPackage!(data.blob!);
                    send({ type: 'RESULT', transferId: data.transferId, targetId: data.senderId, ok: true });
                } catch (error) {
                    send({
                        type: 'RESULT',
                        transferId: data.transferId,
                        targetId: data.senderId,
                        ok: false,
                        error: errorMessage(error),
                    });
                }
            })();
            jobs.set(data.transferId, task);
        }
        // Completed IDs are retained for this instance so late messages cannot repeat an import.
        if (jobs.size > 256) jobs.delete(jobs.keys().next().value!);
    };
    return () => {
        closed = true;
        port.onmessage = null;
        port.close();
        window.removeEventListener('focus', active);
        window.removeEventListener('pointerdown', active);
        window.removeEventListener('keydown', active);
    };
}

/** A transfer chooses one responding instance before asking it to do any work. */
export function createMapTransfer(options: {
    direction: 'push' | 'pull';
    importPackage?: (blob: Blob) => Promise<unknown>;
    onNoPeer?: (transferId: string) => void;
}) {
    const port = channel();
    const transferId = crypto.randomUUID();
    const instanceId = crypto.randomUUID();
    const role: Role = options.direction === 'push' ? 'rmp' : 'rmw';
    const peers = new Map<string, number>();
    let peer: string | undefined;
    let packageBlob: Blob | undefined;
    let started = false;
    let settled = false;
    let importing = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let selection: ReturnType<typeof setTimeout> | undefined;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    let resolveResult: () => void;
    let rejectResult: (reason: Error) => void;
    const result = new Promise<void>((resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
    });
    // Preparing a push may precede slow package generation; cancel must not cause an unhandled rejection.
    void result.catch(() => undefined);
    const send = (message: Omit<Message, 'protocol' | 'senderId' | 'transferId'>) => {
        if (!settled) port.postMessage({ ...message, protocol: PROTOCOL, senderId: instanceId, transferId });
    };
    const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearInterval(interval);
        clearTimeout(deadline);
        clearTimeout(selection);
        clearTimeout(fallback);
        port.close();
        if (error) rejectResult(error);
        else resolveResult();
    };
    const select = () => {
        if (peer || settled || !peers.size) return;
        peer = [...peers].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
        clearInterval(interval);
        clearTimeout(fallback);
        clearTimeout(deadline);
        deadline = setTimeout(
            () => finish(new Error('Map transfer timed out. Retry or import a .rmpmap file.')),
            IMPORT_TIMEOUT
        );
        if (options.direction === 'pull') send({ type: 'EXPORT', targetId: peer });
        else send({ type: 'PACKAGE', targetId: peer, blob: packageBlob });
    };
    port.onmessage = ({ data }: MessageEvent<unknown>) => {
        if (!validMessage(data) || data.transferId !== transferId || data.targetId !== instanceId) return;
        if (data.type === 'AVAILABLE' && data.role === role && !peer) {
            peers.set(data.senderId, Number.isFinite(data.lastActiveAt) ? data.lastActiveAt! : 0);
            selection ??= setTimeout(select, 150);
            return;
        }
        if (data.senderId !== peer) return;
        if (data.type === 'RESULT') {
            finish(data.ok ? undefined : new Error(data.error ?? 'Map import failed'));
        } else if (data.type === 'PACKAGE' && options.direction === 'pull' && data.blob instanceof Blob && !importing) {
            importing = true;
            packageBlob = data.blob;
            void (async () => {
                try {
                    await options.importPackage!(data.blob!);
                    send({ type: 'RESULT', targetId: peer, ok: true });
                    finish();
                } catch (error) {
                    send({ type: 'RESULT', targetId: peer, ok: false, error: errorMessage(error) });
                    finish(new Error(errorMessage(error)));
                }
            })();
        }
    };
    const start = (blob?: Blob) => {
        if (settled) return result;
        if (started) return result;
        started = true;
        packageBlob = blob;
        send({ type: 'DISCOVER', role });
        interval = setInterval(() => send({ type: 'DISCOVER', role }), 500);
        deadline = setTimeout(
            () =>
                finish(
                    new Error('No matching app responded. Open both apps on the same origin or import a .rmpmap file.')
                ),
            READY_TIMEOUT
        );
        if (options.onNoPeer)
            fallback = setTimeout(() => {
                if (!peers.size) options.onNoPeer!(transferId);
            }, 600);
        return result;
    };
    return {
        start,
        getBlob: () => packageBlob,
        cancel: () => {
            if (settled) return;
            send({ type: 'CANCEL', targetId: peer });
            finish(new DOMException('Map transfer cancelled', 'AbortError'));
        },
    };
}

export async function importMapIntoLibrary(blob: Blob) {
    const record = await localMapStore.importPackage(blob);
    notifyMapLibraryChanged();
    return record;
}

export function registerRmpMapReceiver(onImported?: (name: string) => void) {
    return registerMapTransferEndpoint({
        role: 'rmp',
        importPackage: async blob => {
            const record = await importMapIntoLibrary(blob);
            onImported?.(record.name);
        },
    });
}

export function requestMapFromRmw(onNoPeer: (transferId: string) => void) {
    return createMapTransfer({ direction: 'pull', importPackage: importMapIntoLibrary, onNoPeer });
}
