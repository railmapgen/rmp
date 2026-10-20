/** Export work is cancellable without changing the preview playback clock. */
export const throwIfVideoExportAborted = (signal?: AbortSignal): void => {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Video export canceled', 'AbortError');
};

export const waitForVideoExportOperation = <T>(
    operation: PromiseLike<T> | T,
    signal?: AbortSignal,
    timeoutMs = 30_000
): Promise<T> =>
    new Promise<T>((resolve, reject) => {
        const cleanup = () => {
            clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
        };
        const abort = () => {
            cleanup();
            reject(signal?.reason ?? new DOMException('Video export canceled', 'AbortError'));
        };
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('Video encoding timed out'));
        }, timeoutMs);
        signal?.addEventListener('abort', abort, { once: true });
        // Always observe the operation, including after cancellation or a timeout.
        Promise.resolve(operation).then(
            result => {
                cleanup();
                resolve(result);
            },
            error => {
                cleanup();
                reject(error);
            }
        );
        if (signal?.aborted) abort();
    });
