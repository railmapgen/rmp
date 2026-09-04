export interface MapRasterizer {
    render(svg: string, size: number): Promise<Blob>;
    dispose(): void;
}

interface PendingRaster {
    image: HTMLImageElement;
    sourceUrl: string;
    reject: (reason: unknown) => void;
}

export class CanvasMapRasterizer implements MapRasterizer {
    private readonly pending = new Set<PendingRaster>();
    private disposed = false;

    constructor(
        private readonly canvas = document.createElement('canvas'),
        private readonly createImage: (width: number, height: number) => HTMLImageElement = (width, height) =>
            new Image(width, height)
    ) {}

    render(svg: string, size: number) {
        if (this.disposed) {
            return Promise.reject(new DOMException('Map rasterizer disposed', 'AbortError'));
        }

        const source = new Blob([svg], { type: 'image/svg+xml' });
        const sourceUrl = URL.createObjectURL(source);
        let image: HTMLImageElement;
        try {
            image = this.createImage(size, size);
        } catch (error) {
            URL.revokeObjectURL(sourceUrl);
            return Promise.reject(error);
        }

        return new Promise<Blob>((resolve, reject) => {
            let settled = false;
            const finish = (error?: unknown, blob?: Blob) => {
                if (settled) return;
                settled = true;
                image.onload = null;
                image.onerror = null;
                this.pending.delete(request);
                URL.revokeObjectURL(sourceUrl);
                if (error) reject(error);
                else if (blob) resolve(blob);
                else reject(new Error('Unable to encode the map raster'));
            };
            const request: PendingRaster = { image, sourceUrl, reject: error => finish(error) };
            this.pending.add(request);
            image.onload = () => {
                if (this.disposed) {
                    finish(new DOMException('Map rasterizer disposed', 'AbortError'));
                    return;
                }
                try {
                    this.canvas.width = size;
                    this.canvas.height = size;
                    const context = this.canvas.getContext('2d');
                    if (!context) throw new Error('Unable to create the map raster canvas');
                    context.clearRect(0, 0, size, size);
                    context.drawImage(image, 0, 0, size, size);
                    this.canvas.toBlob(
                        blob => {
                            if (this.disposed) finish(new DOMException('Map rasterizer disposed', 'AbortError'));
                            else finish(undefined, blob ?? undefined);
                        },
                        'image/webp',
                        0.92
                    );
                } catch (error) {
                    finish(error);
                }
            };
            image.onerror = () => finish(new Error('Unable to decode the map SVG'));
            image.src = sourceUrl;
        });
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        const error = new DOMException('Map rasterizer disposed', 'AbortError');
        for (const request of [...this.pending]) request.reject(error);
        this.pending.clear();
    }
}

export const createMapRasterizer = (): MapRasterizer | undefined => {
    if (typeof document === 'undefined' || typeof Image !== 'function' || typeof URL?.createObjectURL !== 'function') {
        return undefined;
    }
    try {
        const canvas = document.createElement('canvas');
        if (typeof canvas.toBlob !== 'function') return undefined;
        return new CanvasMapRasterizer(canvas);
    } catch {
        return undefined;
    }
};
