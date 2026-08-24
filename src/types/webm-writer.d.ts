declare module 'webm-writer' {
    interface WebMWriterOptions {
        quality?: number;
        fileWriter?: any;
        fd?: number;
        frameDuration?: number | null;
        frameRate?: number | null;
        transparent?: boolean;
    }

    class WebMWriter {
        constructor(options: WebMWriterOptions);
        addFrame(canvas: HTMLCanvasElement | ImageBitmap): void;
        complete(): Promise<Blob>;
    }

    export = WebMWriter;
}
