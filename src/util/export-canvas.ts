import canvasSize from 'canvas-size';

export interface ExportCanvasSize {
    width: number;
    height: number;
}

interface CanvasSizeTestResult {
    success: boolean;
}

type AsyncCanvasSizeTest = (options: {
    width: number;
    height: number;
    usePromise: true;
    useWorker: true;
}) => boolean | Promise<CanvasSizeTestResult>;

/**
 * Converts an SVG size and export scale into the integer dimensions that will
 * actually be assigned to the browser canvas.
 *
 * Rounding up matches the capability probe and avoids clipping the final row
 * or column when graph bounds contain fractional coordinates.
 */
export const getExportCanvasSize = (width: number, height: number, scale: number): ExportCanvasSize => ({
    width: Math.ceil((width * scale) / 100),
    height: Math.ceil((height * scale) / 100),
});

/**
 * Probes the exact export dimensions instead of inferring support from separate
 * width, height, and area limits. Running the allocation in a worker keeps a
 * rejected large export from blocking the editor's main thread.
 *
 * canvas-size v2 returns a result object for promise-based tests, while the
 * installed v1 type declaration still describes the synchronous boolean API.
 * Keep that compatibility detail contained here rather than leaking casts into
 * the export workflow.
 */
export const testExportCanvasSize = async (size: ExportCanvasSize): Promise<boolean> => {
    if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) {
        return false;
    }
    try {
        const result = await (canvasSize.test as unknown as AsyncCanvasSizeTest)({
            ...size,
            usePromise: true,
            useWorker: true,
        });
        return typeof result === 'boolean' ? result : result.success;
    } catch {
        return false;
    }
};
