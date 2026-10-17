import {
    AudioSampleSource,
    BufferTarget,
    CanvasSource,
    MediaSource,
    Output,
    Quality,
    WebMOutputFormat,
} from 'mediabunny';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { forceCloseVideoExportSource } from './video-export-source-cleanup';

afterEach(() => vi.unstubAllGlobals());

describe('pinned Mediabunny export source cleanup contract', () => {
    it('force-closes both native encoders and retained frames while real Output.finalize is awaiting a flush', async () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 16;
        const source = new CanvasSource(canvas, { codec: 'vp9', quality: new Quality(0.8), alpha: 'keep' });
        let rejectFlush!: (reason: unknown) => void;
        const flush = vi.fn(() => new Promise<void>((_resolve, reject) => (rejectFlush = reject)));
        const colorEncoder = {
            state: 'configured',
            flush,
            close: vi.fn(() => {
                colorEncoder.state = 'closed';
                rejectFlush(new DOMException('Encoder was force-closed', 'AbortError'));
            }),
        };
        const alphaEncoder = {
            state: 'configured',
            flush: vi.fn(async () => undefined),
            close: vi.fn(() => {
                alphaEncoder.state = 'closed';
            }),
        };
        const retainedFrame = { close: vi.fn() };
        const retainedAlphaFrame = { close: vi.fn() };
        const splitter = { close: vi.fn() };
        // Only the test injects controlled codec resources into the real 1.56.1 wrapper; its cleanup code stays real.
        const wrapper = (
            source as unknown as {
                _encoder: {
                    encoder: unknown;
                    alphaEncoder: unknown;
                    frameRateLastSample: unknown;
                    alphaFrameQueue: unknown[];
                    splitter: unknown;
                };
            }
        )._encoder;
        wrapper.encoder = colorEncoder;
        wrapper.alphaEncoder = alphaEncoder;
        const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });
        output.addVideoTrack(source, { frameRate: 30 });
        await output.start();
        const finalizing = output.finalize();
        const rejected = expect(finalizing).rejects.toMatchObject({ name: 'AbortError' });
        await vi.waitFor(() => expect(flush).toHaveBeenCalledOnce());
        expect(output.state).toBe('finalizing');
        await output.cancel();
        expect(colorEncoder.close).not.toHaveBeenCalled();
        wrapper.frameRateLastSample = retainedFrame;
        wrapper.alphaFrameQueue.push(retainedAlphaFrame);
        wrapper.splitter = splitter;

        await forceCloseVideoExportSource(source);

        expect(colorEncoder.close).toHaveBeenCalledOnce();
        expect(alphaEncoder.close).toHaveBeenCalledOnce();
        expect(retainedFrame.close).toHaveBeenCalledOnce();
        expect(retainedAlphaFrame.close).toHaveBeenCalledOnce();
        expect(splitter.close).toHaveBeenCalled();
        expect(wrapper.alphaFrameQueue).toHaveLength(0);
        expect(wrapper.frameRateLastSample).toBeNull();
        await rejected;
        await forceCloseVideoExportSource(source);
        expect(colorEncoder.close).toHaveBeenCalledOnce();
        expect(alphaEncoder.close).toHaveBeenCalledOnce();
    });

    it('calls the force branch directly instead of waiting for an existing close promise', async () => {
        const close = vi.fn(async () => undefined);
        const source = {
            _closingPromise: new Promise<void>(() => {}),
            _flushAndClose: close,
        } as unknown as MediaSource;
        await forceCloseVideoExportSource(source);
        expect(close).toHaveBeenCalledExactlyOnceWith(true);
        expect((source as unknown as { _closed: boolean })._closed).toBe(true);
    });

    it('fails explicitly if a dependency update removes the force-close contract', async () => {
        const close = vi.fn();
        await expect(forceCloseVideoExportSource({ close } as unknown as MediaSource)).rejects.toThrow(
            'cleanup contract is unavailable'
        );
        expect(close).not.toHaveBeenCalled();
    });

    it('registers only one detached cleanup for repeated cancellation of the same initialization', async () => {
        let accept!: () => void;
        const initialization = new Promise<void>(resolve => (accept = resolve));
        const close = vi.fn(async () => undefined);
        const source = {
            _encoder: { ensureEncoderPromise: initialization, encoderInitialized: false },
            _flushAndClose: close,
        } as unknown as MediaSource;
        await forceCloseVideoExportSource(source);
        await forceCloseVideoExportSource(source);
        expect(close).toHaveBeenCalledTimes(2);

        accept();
        await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(3));
        await Promise.resolve();
        expect(close).toHaveBeenCalledTimes(3);
    });

    it.each(['video', 'audio'] as const)(
        'closes a late %s encoder when its support check settles after cancellation',
        async kind => {
            let accept!: () => void;
            let created = 0;
            let closed = 0;
            class ControlledEncoder {
                static isConfigSupported(config: VideoEncoderConfig | AudioEncoderConfig) {
                    return new Promise(resolve => {
                        accept = () => resolve({ supported: true, config });
                    });
                }
                state = 'unconfigured';
                constructor() {
                    created++;
                }
                configure() {
                    this.state = 'configured';
                }
                close() {
                    this.state = 'closed';
                    closed++;
                }
            }
            vi.stubGlobal(kind === 'video' ? 'VideoEncoder' : 'AudioEncoder', ControlledEncoder);
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 16;
            const source =
                kind === 'video'
                    ? new CanvasSource(canvas, { codec: 'vp9', quality: new Quality({ bitrate: 500_000 }) })
                    : new AudioSampleSource({ codec: 'opus', bitrate: 128_000 });
            const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });
            if (source instanceof CanvasSource) output.addVideoTrack(source, { frameRate: 30 });
            else output.addAudioTrack(source);
            await output.start();
            const wrapper = (
                source as unknown as {
                    _encoder: {
                        ensureEncoder(sample: unknown): void;
                        ensureEncoderPromise: Promise<void>;
                        encoder: { state: string };
                    };
                }
            )._encoder;
            wrapper.ensureEncoder(
                kind === 'video'
                    ? { codedWidth: 16, codedHeight: 16, squarePixelWidth: 16, squarePixelHeight: 16 }
                    : { sampleRate: 48_000, numberOfChannels: 2 }
            );
            // Cancellation must finish before the unresolved support promise, including repeated cleanup calls.
            await forceCloseVideoExportSource(source);
            await forceCloseVideoExportSource(source);
            expect(created).toBe(0);
            expect(closed).toBe(0);

            accept();
            await wrapper.ensureEncoderPromise;
            await vi.waitFor(() => expect(closed).toBe(1));

            expect(created).toBe(1);
            expect(wrapper.encoder.state).toBe('closed');
            await forceCloseVideoExportSource(source);
            expect(closed).toBe(1);
            await output.cancel();
        }
    );

    it('also closes a partially created encoder if late configuration rejects', async () => {
        let accept!: () => void;
        let created = 0;
        let closed = 0;
        class ControlledEncoder {
            static isConfigSupported(config: VideoEncoderConfig) {
                return new Promise(resolve => {
                    accept = () => resolve({ supported: true, config });
                });
            }
            state = 'unconfigured';
            constructor() {
                created++;
            }
            configure() {
                throw new Error('Late configure failed');
            }
            close() {
                this.state = 'closed';
                closed++;
            }
        }
        vi.stubGlobal('VideoEncoder', ControlledEncoder);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 16;
        const source = new CanvasSource(canvas, { codec: 'vp9', quality: new Quality({ bitrate: 500_000 }) });
        const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });
        output.addVideoTrack(source, { frameRate: 30 });
        await output.start();
        const wrapper = (
            source as unknown as {
                _encoder: { ensureEncoder(sample: unknown): void; ensureEncoderPromise: Promise<void> };
            }
        )._encoder;
        wrapper.ensureEncoder({ codedWidth: 16, codedHeight: 16, squarePixelWidth: 16, squarePixelHeight: 16 });
        await forceCloseVideoExportSource(source);
        const assertion = expect(wrapper.ensureEncoderPromise).rejects.toThrow('Late configure failed');

        accept();
        await assertion;
        await vi.waitFor(() => expect(closed).toBe(1));

        expect(created).toBe(1);
        await forceCloseVideoExportSource(source);
        expect(closed).toBe(1);
        await output.cancel();
    });
});
