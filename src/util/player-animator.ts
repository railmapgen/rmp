import type { TimelineDiff } from '../constants/timeline';
import type { AnimPhase } from './player-schedule';
import { findPhaseAt } from './player-schedule';
import {
    PlayerCamera,
    type CameraState,
    BUILD_CAMERA_PARAMS,
    GLOBAL_CAMERA_PARAMS,
    zoomToFit,
    calculateBoundingBox,
} from './player-camera';

/**
 * FrameState 是每帧计算后传递给 HUD 的数据快照。
 */
export interface FrameState {
    currentMs: number;
    phase: AnimPhase | null;
    progress: number;
    camera: CameraState;
    stationCount: number;
    mileage: number;
    currentDate: string | null;
    currentRemark: string | null;
    activeLineIds: string[];
    isPlaying: boolean;
}

export interface PlayerAnimatorOptions {
    schedule: AnimPhase[];
    diffs: TimelineDiff[];
    totalDuration: number;
    onProgress?: (state: FrameState) => void;
    /** 边 ID → 绘制方向。reverse 的边为 'backward'（从路径末端开始画）。 */
    edgeDirections?: Map<string, 'forward' | 'backward'>;
}

/**
 * RAF 驱动的动画引擎。
 * 负责：时间推进、Phase 调度、SVG DOM 操作、相机控制。
 * 完全脱离 React 渲染周期。
 */
export class PlayerAnimator {
    private svgContainer: HTMLElement;
    private svgElement: SVGSVGElement | null = null;
    private schedule: AnimPhase[];
    private diffs: TimelineDiff[];
    private totalDuration: number;
    private edgeDirections: Map<string, 'forward' | 'backward'>;

    private rafId: number = 0;
    private lastTimestamp: number = 0;
    private currentMs: number = 0;
    private speed: number = 1;
    private playing: boolean = false;

    private camera: PlayerCamera;
    private phaseIndex: number = -1;
    private settledSince: number | null = null;
    private phaseEnterTime: number | undefined = undefined;
    private canAdvance: boolean = true;
    private lastFrameState: FrameState | null = null;

    private onProgress?: (state: FrameState) => void;

    private appearedEdges: Set<string> = new Set();
    private highlightedEdges: Set<string> = new Set();
    private blinkStyleInjected: boolean = false;

    private stationCount: number = 0;
    private mileage: number = 0;

    constructor(svgContainer: HTMLElement, options: PlayerAnimatorOptions) {
        this.svgContainer = svgContainer;
        this.schedule = options.schedule;
        this.diffs = options.diffs;
        this.totalDuration = options.totalDuration;
        this.onProgress = options.onProgress;
        this.edgeDirections = options.edgeDirections ?? new Map();

        this.svgElement = svgContainer.querySelector<SVGSVGElement>('svg');
        this.prepareSvgDom();

        const initialCam = this.calculateInitialCamera();
        this.camera = new PlayerCamera(initialCam);

        this.updateStats(0);
        this.hideAllEdges();
    }

    /**
     * 克隆进播放器的 SVG 缺少 data-edge-id / data-appear-direction 等属性，
     * 而动画、镜头、统计均依赖这些选择器。这里为每条边的主图层补全属性，
     * 并把 timeline 中计算好的 reverse 标志映射为绘制方向。
     */
    private prepareSvgDom(): void {
        const svg = this.svgElement;
        if (!svg) return;

        svg.querySelectorAll<SVGGElement>('g[id^="line_"]').forEach(g => {
            const id = g.getAttribute('id');
            // 跳过 line_xxx.pre / line_xxx.post 等子图层
            if (!id || id.includes('.')) return;
            g.setAttribute('data-edge-id', id);
            const dir = this.edgeDirections.get(id) ?? 'forward';
            g.setAttribute('data-appear-direction', dir);
            g.setAttribute('data-disappear-direction', dir === 'forward' ? 'backward' : 'forward');
        });
    }

    private calculateInitialCamera(): CameraState {
        const svgEl = this.svgElement;
        const containerRect = this.svgContainer.getBoundingClientRect();
        const viewportW = containerRect.width || 800;
        const viewportH = containerRect.height || 600;

        // HUD 占位估算（像素），与实际 HTML overlay 对齐：
        // 左上角 badge/remark/date ≈ 220px 宽、72px 高
        // 中央偏左 stats ≈ 180px 宽、80px 高
        // 右上角 mini-map ≈ 220px 宽、170px 高
        // 左下角 active-lines ≈ 280px 宽、80px 高
        // 底部居中 controls ≈ 300px 宽、72px 高
        const hudLeft = 220;
        const hudTop = 72;
        const hudRight = 220;
        const hudBottom = 72;

        if (svgEl) {
            const vb = svgEl.viewBox.baseVal;
            if (vb && vb.width > 0 && vb.height > 0) {
                const bbox = { minX: vb.x, maxX: vb.x + vb.width, minY: vb.y, maxY: vb.y + vb.height };
                const zoom = zoomToFit(bbox, viewportW, viewportH, 0.1);
                const cx = (bbox.minX + bbox.maxX) / 2 + (hudLeft - hudRight) / 2;
                const cy = (bbox.minY + bbox.maxY) / 2 + (hudTop - hudBottom) / 2;
                return { cx, cy, zoom };
            }
        }

        const nodes = this.svgContainer.querySelectorAll<SVGElement>('[data-node-id]');
        if (nodes.length > 0) {
            const pts: Array<{ x: number; y: number }> = [];
            nodes.forEach(n => {
                const cx = parseFloat(n.getAttribute('cx') || n.getAttribute('x') || '0');
                const cy = parseFloat(n.getAttribute('cy') || n.getAttribute('y') || '0');
                pts.push({ x: cx, y: cy });
            });
            if (pts.length > 0) {
                const bbox = calculateBoundingBox(pts);
                if (bbox) {
                    const zoom = zoomToFit(bbox, viewportW, viewportH, 0.1);
                    const cx = (bbox.minX + bbox.maxX) / 2 + (hudLeft - hudRight) / 2;
                    const cy = (bbox.minY + bbox.maxY) / 2 + (hudTop - hudBottom) / 2;
                    return { cx, cy, zoom };
                }
            }
        }

        return { cx: 0, cy: 0, zoom: 1 };
    }

    private updateStats(timeMs: number): void {
        if (this.stationCount === 0 && this.svgElement) {
            const stationEls = this.svgElement.querySelectorAll('[id^="stn"]');
            this.stationCount = stationEls.length;
        }

        let totalMileage = 0;
        if (this.svgElement) {
            const edgeEls = this.svgElement.querySelectorAll('[data-edge-id]');
            edgeEls.forEach(el => {
                const mileageStr = el.getAttribute('data-mileage');
                if (mileageStr) {
                    totalMileage += parseFloat(mileageStr) || 0;
                }
            });
        }
        if (totalMileage === 0) {
            totalMileage = 50;
        }

        const progress = this.totalDuration > 0 ? Math.min(1, timeMs / this.totalDuration) : 0;
        this.mileage = totalMileage * progress;
    }

    private applyDrawingAnimation(phase: AnimPhase, progress: number): void {
        if (!this.svgElement) return;

        const edgeGroups = this.svgElement.querySelectorAll<HTMLElement>('g[data-edge-id]');
        edgeGroups.forEach(g => {
            const edgeId = g.getAttribute('data-edge-id');
            if (!edgeId || edgeId !== phase.edgeId) return;

            // 正在绘制的边必须可见（hideAllEdges 的样式会让其 opacity 为 0）
            g.style.opacity = '1';

            const direction =
                phase.edgeAction === 'remove'
                    ? g.getAttribute('data-disappear-direction') || 'forward'
                    : g.getAttribute('data-appear-direction') || 'forward';

            g.querySelectorAll<SVGPathElement>('path').forEach(path => {
                try {
                    const len = path.getTotalLength();
                    if (!len || len <= 0) return;

                    // 停运严格复用开通的路径计算，只把时间进度反向。
                    // 开通：0 → 1；停运：1 → 0。因此两者的每一帧是彼此的镜像。
                    const drawProgress = phase.edgeAction === 'remove' ? 1 - progress : progress;
                    path.setAttribute('stroke-dasharray', String(len));
                    if (drawProgress >= 1) {
                        path.setAttribute('stroke-dashoffset', '0');
                    } else if (direction === 'forward') {
                        path.setAttribute('stroke-dashoffset', String(len * (1 - drawProgress)));
                    } else {
                        path.setAttribute('stroke-dashoffset', String(len * drawProgress));
                    }
                } catch (e) {
                    // 忽略 getTotalLength() 错误
                }
            });
        });
    }

    private applyHighlightAnimation(phase: AnimPhase): void {
        if (!this.svgElement || !phase.edgeId) return;

        const g = this.svgElement.querySelector<HTMLElement>(`g[data-edge-id="${phase.edgeId}"]`);
        if (!g) return;

        if (!this.blinkStyleInjected) {
            this.injectBlinkStyle();
            this.blinkStyleInjected = true;
        }

        // 高亮的边保持可见（覆盖 hideAllEdges 的隐藏样式）
        g.style.opacity = '1';
        g.classList.add('rmp-selected-glow', 'rmp-glow-blink');
        this.highlightedEdges.add(phase.edgeId);
    }

    private injectBlinkStyle(): void {
        if (!this.svgElement) return;
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.textContent = `
        @keyframes rmp-glow-blink-kf {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
        .rmp-glow-blink {
            animation: rmp-glow-blink-kf 1s ease-in-out infinite;
        }
    `;
        this.svgElement.insertBefore(style, this.svgElement.firstChild);
    }

    private resetNonActiveEdges(phase: AnimPhase): void {
        if (!this.svgElement) return;

        this.highlightedEdges.forEach(edgeId => {
            const g = this.svgElement!.querySelector<HTMLElement>(`g[data-edge-id="${edgeId}"]`);
            if (g) {
                g.classList.remove('rmp-selected-glow', 'rmp-glow-blink');
                g.style.opacity = '1';
            }
        });
        this.highlightedEdges.clear();

        const edgeGroups = this.svgElement.querySelectorAll<HTMLElement>('g[data-edge-id]');
        edgeGroups.forEach(g => {
            const edgeId = g.getAttribute('data-edge-id');
            if (!edgeId || edgeId === phase.edgeId) return;

            g.querySelectorAll<SVGPathElement>('path').forEach(path => {
                path.removeAttribute('stroke-dasharray');
                path.removeAttribute('stroke-dashoffset');
            });

            if (this.appearedEdges.has(edgeId)) {
                g.style.opacity = '1';
            }
        });
    }

    private hideAllEdges(): void {
        if (!this.svgElement) return;
        this.svgElement.querySelector('#rmp-player-hide-style')?.remove();
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.id = 'rmp-player-hide-style';
        style.textContent = 'g[data-edge-id] { opacity: 0; }';
        this.svgElement.insertBefore(style, this.svgElement.firstChild);
    }

    private applyCameraTransform(): void {
        const cam = this.camera.getState();
        const svgEl = this.svgElement;
        if (!svgEl) return;

        const containerRect = this.svgContainer.getBoundingClientRect();
        const cw = containerRect.width || 800;
        const ch = containerRect.height || 600;

        const vb = svgEl.viewBox.baseVal;
        const origVbW = vb.width || svgEl.width.baseVal.value || 800;
        const origVbH = vb.height || svgEl.height.baseVal.value || 600;

        if (cam.zoom > 0 && origVbW > 0 && origVbH > 0) {
            const newVbW = cw / cam.zoom;
            const newVbH = ch / cam.zoom;
            const newVbX = cam.cx - newVbW / 2;
            const newVbY = cam.cy - newVbH / 2;

            vb.x = newVbX;
            vb.y = newVbY;
            vb.width = newVbW;
            vb.height = newVbH;
        }
    }

    private updateCameraTarget(phase: AnimPhase, progress: number): void {
        if (!this.svgElement || !phase.edgeId) return;

        const g = this.svgElement.querySelector<HTMLElement>(`g[data-edge-id="${phase.edgeId}"]`);
        if (!g) return;

        const direction = g.getAttribute('data-appear-direction') || 'forward';
        const path = g.querySelector<SVGPathElement>('path');
        if (!path) return;

        try {
            const len = path.getTotalLength();
            if (!len || len <= 0) return;

            const p = direction === 'forward' ? progress : 1 - progress;
            const point = path.getPointAtLength(len * Math.max(0, Math.min(1, p)));

            const currentZoom = this.camera.getState().zoom;
            // 应用 HUD 偏移：动画过程中始终让目标避开 HUD 区域
            const hudLeft = 220;
            const hudTop = 72;
            const hudRight = 220;
            const hudBottom = 72;
            this.camera.setTarget(point.x + (hudLeft - hudRight) / 2, point.y + (hudTop - hudBottom) / 2, currentZoom);
        } catch (e) {
            // 忽略
        }
    }

    /**
     * 将相机目标预瞄到指定边的绘制起点。
     * direction 为 backward 时该边从路径末端开始绘制，因此预瞄路径终点。
     * 用于 segmentHold 阶段：镜头在空闲间隙滑向下一段起点，避免跳动。
     */
    private updateCameraToEdgeStart(edgeId: string, direction?: 'forward' | 'backward'): void {
        if (!this.svgElement) return;

        const g = this.svgElement.querySelector<HTMLElement>(`g[data-edge-id="${edgeId}"]`);
        if (!g) return;

        // 未显式指定方向时，回退读取 DOM 上的绘制方向（reverse 边从路径末端开始）
        const dir = direction ?? ((g.getAttribute('data-appear-direction') as 'forward' | 'backward') || 'forward');

        const path = g.querySelector<SVGPathElement>('path');
        if (!path) return;

        try {
            const len = path.getTotalLength();
            if (!len || len <= 0) return;

            const point = path.getPointAtLength(len * (dir === 'backward' ? 1 : 0));

            const currentZoom = this.camera.getState().zoom;
            const hudLeft = 220;
            const hudTop = 72;
            const hudRight = 220;
            const hudBottom = 72;
            this.camera.setTarget(point.x + (hudLeft - hudRight) / 2, point.y + (hudTop - hudBottom) / 2, currentZoom);
        } catch (e) {
            // 忽略
        }
    }

    private applyFrame(ms: number, snapCamera: boolean = false): void {
        const lastEndMs = this.schedule.length > 0 ? Math.max(...this.schedule.map(p => p.endMs)) : 0;
        const result =
            findPhaseAt(this.schedule, ms) ??
            (ms >= lastEndMs && this.schedule.length > 0
                ? { phase: this.schedule[this.schedule.length - 1], progress: 1 }
                : null);
        if (!result) {
            if (this.lastFrameState) {
                this.lastFrameState = null;
            }
            if (ms === 0) {
                this.hideAllEdges();
            }
            if (snapCamera) this.camera.snapToTarget();
            this.applyCameraTransform();
            return;
        }

        const { phase, progress } = result;

        if (this.phaseIndex !== this.schedule.indexOf(phase)) {
            this.phaseIndex = this.schedule.indexOf(phase);
            this.settledSince = null;
            this.phaseEnterTime = ms;
            this.canAdvance = false;

            if (phase.type === 'segment' || phase.type === 'segmentHold') {
                this.camera.setParams(BUILD_CAMERA_PARAMS, 'build');
            } else {
                this.camera.setParams(GLOBAL_CAMERA_PARAMS, 'global');
            }
        }

        if (phase.type === 'segment') {
            if (phase.parallelEdges) {
                phase.parallelEdges.forEach(parallel => {
                    this.applyDrawingAnimation(
                        {
                            ...phase,
                            edgeId: parallel.edgeId,
                            edgeAction: parallel.edgeAction,
                            direction: parallel.direction,
                            isDrawing: parallel.isDrawing,
                        },
                        progress
                    );
                });
            }
            if (phase.edgeAction === 'highlight') {
                this.applyHighlightAnimation(phase);
                this.resetNonActiveEdges(phase);
            } else {
                this.applyDrawingAnimation(phase, progress);
                this.resetNonActiveEdges(phase);

                if (phase.edgeAction === 'add' && progress >= 1 && phase.edgeId) {
                    this.appearedEdges.add(phase.edgeId);
                } else if (phase.edgeAction === 'remove' && phase.edgeId) {
                    this.appearedEdges.add(phase.edgeId);
                    if (progress >= 1) {
                        this.appearedEdges.delete(phase.edgeId);
                    }
                }

                if (phase.edgeAction === 'add' || phase.edgeAction === 'remove') {
                    this.updateCameraTarget(phase, phase.edgeAction === 'remove' ? 1 - progress : progress);
                }
            }
        } else if (phase.type === 'segmentHold') {
            // 空闲间隙：镜头预瞄下一段绘制起点，保持画面连续运动
            if (phase.nextEdgeId) {
                this.updateCameraToEdgeStart(phase.nextEdgeId, phase.nextDirection);
            }
            this.resetNonActiveEdges(phase);
        } else {
            this.resetNonActiveEdges(phase);
        }

        if (snapCamera) this.camera.snapToTarget();
        else this.camera.update(1 / 60);
        this.applyCameraTransform();

        this.canAdvance = true;

        this.updateStats(ms);

        if (this.onProgress) {
            const frameState: FrameState = {
                currentMs: ms,
                phase,
                progress,
                camera: this.camera.getState(),
                stationCount: this.stationCount,
                mileage: this.mileage,
                currentDate: null,
                currentRemark: null,
                activeLineIds: [],
                isPlaying: this.playing,
            };
            this.onProgress(frameState);
            this.lastFrameState = frameState;
        }
    }

    // ===== 公共 API =====

    start(): void {
        if (this.playing) return;
        this.applyFrame(this.currentMs);

        this.playing = true;
        this.lastTimestamp = 0;
        const tick = (timestamp: number) => {
            if (!this.playing) return;

            if (!this.lastTimestamp) this.lastTimestamp = timestamp;
            const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
            this.lastTimestamp = timestamp;

            if (this.canAdvance) {
                this.currentMs += dt * this.speed * 1000;
            }

            if (this.currentMs >= this.totalDuration) {
                this.currentMs = this.totalDuration;
                this.applyFrame(this.currentMs);
                this.playing = false;
                return;
            }

            this.applyFrame(this.currentMs);
            this.rafId = requestAnimationFrame(tick);
        };
        this.rafId = requestAnimationFrame(tick);
    }

    stop(): void {
        this.playing = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
        }
        this.currentMs = 0;
        this.phaseIndex = -1;
        this.settledSince = null;
        this.canAdvance = true;
        this.lastTimestamp = 0;
        this.appearedEdges.clear();
        this.highlightedEdges.forEach(edgeId => {
            const g = this.svgElement?.querySelector<HTMLElement>(`g[data-edge-id="${edgeId}"]`);
            if (g) {
                g.classList.remove('rmp-selected-glow', 'rmp-glow-blink');
                g.style.opacity = '1';
            }
        });
        this.highlightedEdges.clear();
        this.blinkStyleInjected = false;
        this.hideAllEdges();
    }

    pause(): void {
        this.playing = false;
    }

    resume(): void {
        if (this.currentMs >= this.totalDuration) {
            this.currentMs = 0;
        }
        this.start();
    }

    seek(ms: number): void {
        this.currentMs = Math.max(0, Math.min(ms, this.totalDuration));
        this.appearedEdges.clear();
        this.schedule.forEach(phase => {
            if (phase.endMs > this.currentMs || !phase.edgeId) return;
            if (phase.edgeAction === 'remove') this.appearedEdges.delete(phase.edgeId);
            else if (phase.edgeAction === 'add') this.appearedEdges.add(phase.edgeId);
        });
        this.phaseIndex = -1;
        this.settledSince = null;
        this.canAdvance = true;
        this.lastTimestamp = 0;
        this.applyFrame(this.currentMs, true);
    }

    setSpeed(speed: number): void {
        this.speed = Math.max(0.1, speed);
    }

    getCurrentTime(): number {
        return this.currentMs;
    }

    getState(): FrameState | null {
        return this.lastFrameState;
    }

    getIsPlaying(): boolean {
        return this.playing;
    }

    destroy(): void {
        this.stop();
        this.svgElement = null;
        this.lastFrameState = null;
    }
}
