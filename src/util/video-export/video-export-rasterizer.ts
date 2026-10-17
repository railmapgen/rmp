import { throwIfVideoExportAborted } from './video-export-control';

/** Export-only rasterization: preview keeps displaying its live SVG directly. */
export const renderVideoSVGToCanvas = async (
    svg: SVGSVGElement,
    canvas: HTMLCanvasElement,
    transparent: boolean,
    background: string,
    signal?: AbortSignal
): Promise<void> => {
    throwIfVideoExportAborted(signal);
    // Do not request willReadFrequently: the native encoding path can retain browser GPU-backed surfaces.
    const ctx = canvas.getContext('2d', { alpha: transparent });
    if (!ctx) throw new Error('Could not create video canvas');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!transparent) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // Keep fonts/images self-contained inside the SVG, without base64-encoding that entire SVG again.
    const markup = svg.outerHTML.replace(/&nbsp;/g, ' ').replace(/\p{Cc}/gu, '');
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    try {
        await new Promise<void>((resolve, reject) => {
            const finish = (error?: unknown) => {
                clearTimeout(timer);
                signal?.removeEventListener('abort', abort);
                image.onload = null;
                image.onerror = null;
                image.removeAttribute('src');
                if (error !== undefined) reject(error);
                else resolve();
            };
            const abort = () => finish(signal?.reason ?? new DOMException('Video export canceled', 'AbortError'));
            const timer = setTimeout(() => finish(new Error('Video SVG rendering timed out')), 30_000);
            image.onload = () => {
                try {
                    throwIfVideoExportAborted(signal);
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                    finish();
                } catch (error) {
                    finish(error);
                }
            };
            image.onerror = () => finish(new Error('Could not render video SVG'));
            signal?.addEventListener('abort', abort, { once: true });
            if (signal?.aborted) abort();
            else image.src = url;
        });
    } finally {
        URL.revokeObjectURL(url);
    }
};
