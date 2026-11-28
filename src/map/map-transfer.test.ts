import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMapTransfer, MAP_TRANSFER_CHANNEL, registerMapTransferEndpoint } from './map-transfer';

class TestChannel {
    static ports = new Set<TestChannel>();
    static messages: unknown[] = [];
    onmessage: ((event: MessageEvent) => void) | null = null;
    constructor(readonly name: string) {
        TestChannel.ports.add(this);
    }
    postMessage(data: unknown) {
        TestChannel.messages.push(data);
        for (const port of TestChannel.ports) {
            if (port !== this && port.name === this.name)
                queueMicrotask(() => {
                    if (TestChannel.ports.has(port)) port.onmessage?.({ data } as MessageEvent);
                });
        }
    }
    close() {
        TestChannel.ports.delete(this);
    }
}

describe('same-origin map transfer', () => {
    const cleanups: (() => void)[] = [];
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('BroadcastChannel', TestChannel);
    });
    afterEach(() => {
        for (const cleanup of cleanups.splice(0)) cleanup();
        TestChannel.ports.clear();
        TestChannel.messages = [];
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });
    it('acknowledges a push only after the IndexedDB import has completed', async () => {
        let commit!: () => void;
        const importer = vi.fn(
            () =>
                new Promise<void>(resolve => {
                    commit = resolve;
                })
        );
        cleanups.push(registerMapTransferEndpoint({ role: 'rmp', importPackage: importer }));
        const transfer = createMapTransfer({ direction: 'push' });
        cleanups.push(transfer.cancel);
        let complete = false;
        const pending = transfer.start(new Blob(['package'])).then(() => {
            complete = true;
        });
        await vi.advanceTimersByTimeAsync(200);
        expect(importer).toHaveBeenCalledOnce();
        expect(complete).toBe(false);
        commit();
        await pending;
        expect(complete).toBe(true);
    });
    it('selects one RMW exporter and one importer when multiple instances respond', async () => {
        const first = vi.fn(async () => new Blob(['one']));
        const second = vi.fn(async () => new Blob(['two']));
        cleanups.push(registerMapTransferEndpoint({ role: 'rmw', exportPackage: first }));
        cleanups.push(registerMapTransferEndpoint({ role: 'rmw', exportPackage: second }));
        const importer = vi.fn(async () => undefined);
        const fallback = vi.fn();
        const transfer = createMapTransfer({ direction: 'pull', importPackage: importer, onNoPeer: fallback });
        cleanups.push(transfer.cancel);
        const pending = transfer.start();
        await vi.advanceTimersByTimeAsync(200);
        await pending;
        expect(first.mock.calls.length + second.mock.calls.length).toBe(1);
        expect(importer).toHaveBeenCalledOnce();
        expect(fallback).not.toHaveBeenCalled();
    });
    it('starts a transfer-scoped bridge only when no live RMW responds', async () => {
        const exporter = vi.fn(async () => new Blob(['stored project']));
        const fallback = vi.fn((bridgeId: string) => {
            cleanups.push(registerMapTransferEndpoint({ role: 'rmw', bridgeId, exportPackage: exporter }));
        });
        const importer = vi.fn(async () => undefined);
        const transfer = createMapTransfer({ direction: 'pull', importPackage: importer, onNoPeer: fallback });
        cleanups.push(transfer.cancel);
        const pending = transfer.start();
        await vi.advanceTimersByTimeAsync(1300);
        await pending;
        expect(fallback).toHaveBeenCalledOnce();
        expect(exporter).toHaveBeenCalledOnce();
        expect(importer).toHaveBeenCalledOnce();
    });
    it('returns a draft/export error without falling back to a stale saved project', async () => {
        cleanups.push(
            registerMapTransferEndpoint({
                role: 'rmw',
                exportPackage: async () => {
                    throw new Error('Finish the draft first');
                },
            })
        );
        const fallback = vi.fn();
        const transfer = createMapTransfer({ direction: 'pull', importPackage: vi.fn(), onNoPeer: fallback });
        cleanups.push(transfer.cancel);
        const pending = expect(transfer.start()).rejects.toThrow('Finish the draft first');
        await vi.advanceTimersByTimeAsync(200);
        await pending;
        expect(fallback).not.toHaveBeenCalled();
    });
    it('does not import a duplicated package message twice', async () => {
        const importer = vi.fn(async () => undefined);
        cleanups.push(registerMapTransferEndpoint({ role: 'rmp', importPackage: importer }));
        const transfer = createMapTransfer({ direction: 'push' });
        const pending = transfer.start(new Blob(['package']));
        await vi.advanceTimersByTimeAsync(200);
        await pending;
        const message = TestChannel.messages.find(value => (value as { type: string }).type === 'PACKAGE');
        for (const port of TestChannel.ports) port.onmessage?.({ data: message } as MessageEvent);
        await vi.advanceTimersByTimeAsync(0);
        expect(importer).toHaveBeenCalledOnce();
    });
    it('cancels and times out with all listeners and timers released', async () => {
        const transfer = createMapTransfer({ direction: 'pull', importPackage: vi.fn() });
        const cancelled = expect(transfer.start()).rejects.toMatchObject({ name: 'AbortError' });
        transfer.cancel();
        await cancelled;
        expect(TestChannel.ports.size).toBe(0);
        const absent = createMapTransfer({ direction: 'push' });
        const timedOut = expect(absent.start(new Blob())).rejects.toThrow('same origin');
        await vi.advanceTimersByTimeAsync(30_000);
        await timedOut;
        expect(TestChannel.ports.size).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('selects the most recently active exporter among several RMW instances', async () => {
        vi.setSystemTime(1000);
        const focus = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
        const active = vi.fn(async () => new Blob(['active']));
        const background = vi.fn(async () => new Blob(['background']));
        cleanups.push(registerMapTransferEndpoint({ role: 'rmw', exportPackage: active }));
        focus.mockReturnValue(false);
        cleanups.push(registerMapTransferEndpoint({ role: 'rmw', exportPackage: background }));
        const transfer = createMapTransfer({ direction: 'pull', importPackage: vi.fn() });
        cleanups.push(transfer.cancel);
        const pending = transfer.start();
        await vi.advanceTimersByTimeAsync(200);
        await pending;
        expect(active).toHaveBeenCalledOnce();
        expect(background).not.toHaveBeenCalled();
        focus.mockRestore();
    });

    it('suppresses the package of a pull cancelled during source generation', async () => {
        let finish!: (blob: Blob) => void;
        const exporter = vi.fn(
            () =>
                new Promise<Blob>(resolve => {
                    finish = resolve;
                })
        );
        const importer = vi.fn();
        cleanups.push(registerMapTransferEndpoint({ role: 'rmw', exportPackage: exporter }));
        const transfer = createMapTransfer({ direction: 'pull', importPackage: importer });
        const rejected = expect(transfer.start()).rejects.toMatchObject({ name: 'AbortError' });
        await vi.advanceTimersByTimeAsync(200);
        expect(exporter).toHaveBeenCalledOnce();
        transfer.cancel();
        await rejected;
        await vi.advanceTimersByTimeAsync(0);
        finish(new Blob(['cancelled map']));
        await vi.advanceTimersByTimeAsync(0);
        expect(importer).not.toHaveBeenCalled();
        expect(TestChannel.messages.some(value => (value as { type: string }).type === 'PACKAGE')).toBe(false);
    });

    it('does not import late or replayed package messages after targeted cancellation', async () => {
        const importer = vi.fn();
        cleanups.push(registerMapTransferEndpoint({ role: 'rmp', importPackage: importer }));
        const client = new TestChannel(MAP_TRANSFER_CHANNEL);
        cleanups.push(() => client.close());
        const base = { protocol: 'rmw-rmp-map-v1', transferId: 'cancelled-transfer', senderId: 'client' };
        client.postMessage({ ...base, type: 'DISCOVER', role: 'rmp' });
        await vi.advanceTimersByTimeAsync(0);
        const reply = TestChannel.messages.find(value => (value as { type: string }).type === 'AVAILABLE') as {
            senderId: string;
        };
        client.postMessage({ ...base, type: 'CANCEL', targetId: reply.senderId });
        client.postMessage({ ...base, type: 'PACKAGE', targetId: reply.senderId, blob: new Blob(['late']) });
        await vi.advanceTimersByTimeAsync(0);
        expect(importer).not.toHaveBeenCalled();
    });

    it('rejects overlapping export requests without starting a second publication', async () => {
        let finish!: (blob: Blob) => void;
        const exporter = vi.fn(
            () =>
                new Promise<Blob>(resolve => {
                    finish = resolve;
                })
        );
        cleanups.push(registerMapTransferEndpoint({ role: 'rmw', exportPackage: exporter }));
        const first = createMapTransfer({ direction: 'pull', importPackage: vi.fn() });
        const second = createMapTransfer({ direction: 'pull', importPackage: vi.fn() });
        cleanups.push(first.cancel, second.cancel);
        const results = Promise.allSettled([first.start(), second.start()]);
        await vi.advanceTimersByTimeAsync(200);
        expect(exporter).toHaveBeenCalledOnce();
        finish(new Blob(['map']));
        await vi.advanceTimersByTimeAsync(0);
        const settled = await results;
        expect(settled.filter(value => value.status === 'fulfilled')).toHaveLength(1);
        expect(settled.filter(value => value.status === 'rejected')).toHaveLength(1);
        const failed = settled.find(value => value.status === 'rejected') as PromiseRejectedResult;
        expect(failed.reason.message).toContain('already exporting');
    });

    it('ignores other protocols and unrelated bridge transfer IDs and removes activity listeners', async () => {
        const removed = vi.spyOn(window, 'removeEventListener');
        const exporter = vi.fn();
        const unregister = registerMapTransferEndpoint({ role: 'rmw', bridgeId: 'scoped', exportPackage: exporter });
        const client = new TestChannel(MAP_TRANSFER_CHANNEL);
        client.postMessage({
            protocol: 'other-v1',
            transferId: 'scoped',
            senderId: 'client',
            type: 'DISCOVER',
            role: 'rmw',
        });
        client.postMessage({
            protocol: 'rmw-rmp-map-v1',
            transferId: 'unrelated',
            senderId: 'client',
            type: 'DISCOVER',
            role: 'rmw',
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(TestChannel.messages.filter(value => (value as { type: string }).type === 'AVAILABLE')).toHaveLength(0);
        unregister();
        expect(removed).toHaveBeenCalledWith('focus', expect.any(Function));
        expect(removed).toHaveBeenCalledWith('pointerdown', expect.any(Function));
        expect(removed).toHaveBeenCalledWith('keydown', expect.any(Function));
        expect(exporter).not.toHaveBeenCalled();
        client.close();
        removed.mockRestore();
    });
});
