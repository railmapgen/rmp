declare module 'recordrtc' {
    interface RecordRTCOptions {
        mimeType?: string;
        type?: string;
        canvas?: {
            width: number;
            height: number;
        };
        frameRate?: number;
        fps?: number;
        quality?: number;
        width?: number;
        height?: number;
    }

    class RecordRTC {
        constructor(stream: MediaStream, options?: RecordRTCOptions);
        startRecording(): void;
        stopRecording(callback: (blob: Blob) => void): void;
        getBlob(): Blob;
        reset(): void;
        destroy(): void;
    }

    export default RecordRTC;
}
