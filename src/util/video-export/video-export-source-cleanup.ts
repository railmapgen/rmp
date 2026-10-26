import type { MediaSource } from 'mediabunny';

interface ForceClosableExportSource {
    _flushAndClose?: (forceClose: boolean) => Promise<void> | void;
    _closingPromise?: Promise<void> | null;
    _closed?: boolean;
    _encoder?: {
        ensureEncoderPromise?: Promise<void> | null;
        encoderInitialized?: boolean;
    };
}

const observedInitializations = new WeakMap<MediaSource, Promise<void>>();

/**
 * Failure/cancellation only. This narrowly adapts the pinned Mediabunny 1.56.1 source contract:
 * Output.cancel() does nothing while finalizing, and public source.close() reuses a pending flush.
 * The force branch bypasses that promise and directly closes native encoders, retained frames, and the alpha worker.
 * Keep its contract test and the dependency pin together when updating Mediabunny.
 */
export const forceCloseVideoExportSource = async (source: MediaSource): Promise<void> => {
    const adapted = source as unknown as ForceClosableExportSource;
    if (typeof adapted._flushAndClose !== 'function') {
        throw new Error('Mediabunny 1.56.1 export source cleanup contract is unavailable');
    }
    const forceClose = adapted._flushAndClose;
    const initialization = adapted._encoder?.ensureEncoderPromise;
    if (
        initialization &&
        !adapted._encoder?.encoderInitialized &&
        observedInitializations.get(source) !== initialization
    ) {
        observedInitializations.set(source, initialization);
        // Native support checks/custom init may finish after cancellation creates the first encoder.
        // Observe each initialization exactly once and close its late resources without awaiting it here.
        // Call the force branch directly, avoiding recursive registration for an already-settled promise.
        const closeLateInitialization = async () => {
            try {
                await forceClose.call(source, true);
                adapted._closed = true;
            } catch {
                // This is detached failure cleanup; it must never create an unhandled rejection.
            }
        };
        void initialization.then(closeLateInitialization, closeLateInitialization);
    }
    // Closing an encoder rejects a flush already in progress. Observe it even if the caller stopped waiting.
    void adapted._closingPromise?.catch(() => undefined);
    await forceClose.call(source, true);
    adapted._closed = true;
};
