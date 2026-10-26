import { Mp4OutputFormat, Output, WebMOutputFormat } from 'mediabunny';
import type { VideoSource } from 'mediabunny';
import type { VideoEncodingOptions } from './video-encoder';
import { createVideoExportAudio } from './video-export-audio';
import { throwIfVideoExportAborted, waitForVideoExportOperation } from './video-export-control';
import { createVideoExportDestination, VideoExportResult, VideoExportStorageError } from './video-export-destination';
import { forceCloseVideoExportSource } from './video-export-source-cleanup';

export class VideoOutputFinalizationError extends Error {
    constructor(cause: unknown) {
        super('Could not finalize the video container', { cause });
    }
}

/** Both native frames and small software batches feed this one disk-backed container. */
export const createVideoOutputSession = async (source: VideoSource, options: VideoEncodingOptions) => {
    throwIfVideoExportAborted(options.signal);
    let abandonedDestination = false;
    const pendingDestination = (options.destinationFactory ?? createVideoExportDestination)();
    let arrivedDestination: Awaited<typeof pendingDestination> | undefined;
    // Browser storage setup cannot always be aborted. Dispose a late result after the caller has canceled.
    void pendingDestination.then(
        destination => {
            arrivedDestination = destination;
            if (abandonedDestination) void destination.dispose().catch(() => undefined);
        },
        () => undefined
    );
    let destination: Awaited<typeof pendingDestination>;
    try {
        destination = await waitForVideoExportOperation(pendingDestination, options.signal);
    } catch (error) {
        abandonedDestination = true;
        await arrivedDestination?.dispose().catch(() => undefined);
        throw error;
    }
    let audio: Awaited<ReturnType<typeof createVideoExportAudio>> = undefined;
    let output: Output | undefined;
    let completed = false;
    let disposed = false;
    try {
        audio = await createVideoExportAudio(options.audioTracks ?? [], options.format, options.signal);
        throwIfVideoExportAborted(options.signal);
        output = new Output({
            // Ordinary MP4 with tail metadata avoids retaining all compressed media for Fast Start.
            format: options.format === 'mp4' ? new Mp4OutputFormat({ fastStart: false }) : new WebMOutputFormat(),
            target: destination.target,
        });
        output.addVideoTrack(source, { frameRate: options.fps });
        if (audio) output.addAudioTrack(audio.source);
        await waitForVideoExportOperation(output.start(), options.signal);
    } catch (error) {
        await forceCloseVideoExportSource(source).catch(() => undefined);
        if (audio) await forceCloseVideoExportSource(audio.source).catch(() => undefined);
        await output?.cancel().catch(() => undefined);
        await audio?.dispose().catch(() => undefined);
        await destination.dispose().catch(() => undefined);
        throw error;
    }
    const activeOutput = output;
    return {
        async addAudioUntil(time: number) {
            throwIfVideoExportAborted(options.signal);
            await audio?.addUntil(time);
        },
        async complete(duration: number): Promise<VideoExportResult> {
            throwIfVideoExportAborted(options.signal);
            await audio?.complete(duration);
            throwIfVideoExportAborted(options.signal);
            try {
                await waitForVideoExportOperation(activeOutput.finalize(), options.signal);
            } catch (error) {
                throwIfVideoExportAborted(options.signal);
                if (error instanceof VideoExportStorageError) throw error;
                throw new VideoOutputFinalizationError(error);
            }
            throwIfVideoExportAborted(options.signal);
            const result = await destination.complete(`video/${options.format}`);
            completed = true;
            return result;
        },
        async dispose() {
            if (disposed) return;
            disposed = true;
            try {
                if (!completed) {
                    // cancel() cannot interrupt finalize() in the pinned library; close native codecs first.
                    await forceCloseVideoExportSource(source).catch(() => undefined);
                    if (audio) await forceCloseVideoExportSource(audio.source).catch(() => undefined);
                    await activeOutput.cancel().catch(() => undefined);
                }
            } finally {
                try {
                    await audio?.dispose();
                } finally {
                    await destination.dispose();
                }
            }
        },
    };
};
