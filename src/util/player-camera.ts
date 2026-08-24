/** 相机状态 */
export interface CameraState {
    cx: number;
    cy: number;
    zoom: number;
}

/** 相机控制参数 */
export interface CameraParams {
    approach: number;
    maxSpeedMult: number;
    dirBlend: number;
    zoomApproach: number;
    zoomMaxLogSpeed: number;
    zoomDirBlend: number;
}

/** 构建模式相机参数 - 较低速度，用于跟踪线路段绘制 */
export const BUILD_CAMERA_PARAMS: CameraParams = {
    approach: 3.5,
    maxSpeedMult: 8,
    dirBlend: 4,
    zoomApproach: 3,
    zoomMaxLogSpeed: 1.5,
    zoomDirBlend: 4,
};

/** 全局模式相机参数 - 较高速度，用于全局移动 */
export const GLOBAL_CAMERA_PARAMS: CameraParams = {
    approach: 12,
    maxSpeedMult: 25,
    dirBlend: 8,
    zoomApproach: 10,
    zoomMaxLogSpeed: 3.0,
    zoomDirBlend: 8,
};

/**
 * 弹簧缓动相机控制器。
 * 支持平滑的位置和缩放过渡，包括 building 和 global 两种模式。
 */
export class PlayerCamera {
    private state: CameraState;
    private target: CameraState;
    private params: CameraParams;
    private velX: number = 0;
    private velY: number = 0;
    private velLogZoom: number = 0;
    private mode: 'build' | 'global' = 'build';

    constructor(initialState: CameraState) {
        this.state = { ...initialState };
        this.target = { ...initialState };
        this.params = { ...BUILD_CAMERA_PARAMS };
    }

    /** 设置目标位置 */
    setTarget(cx: number, cy: number, zoom: number): void {
        this.target.cx = cx;
        this.target.cy = cy;
        this.target.zoom = zoom;
    }

    /** 切换参数组 */
    setParams(params: CameraParams, mode: 'build' | 'global'): void {
        this.params = { ...params };
        this.mode = mode;
    }

    /**
     * 每帧调用的弹簧缓动更新。
     * @param dt - 帧间隔（秒）
     */
    update(dt: number): CameraState {
        // 位置弹簧
        const dx = this.target.cx - this.state.cx;
        const dy = this.target.cy - this.state.cy;
        const dist = Math.hypot(dx, dy);

        const idealSpeed = dist * this.params.approach;
        const maxSpeed = this.params.maxSpeedMult;
        const clampedSpeed = Math.min(idealSpeed, maxSpeed);

        const nx = dist > 0 ? dx / dist : 0;
        const ny = dist > 0 ? dy / dist : 0;

        this.velX += (nx * clampedSpeed - this.velX) * this.params.dirBlend * dt;
        this.velY += (ny * clampedSpeed - this.velY) * this.params.dirBlend * dt;

        const speed = Math.hypot(this.velX, this.velY);
        if (speed > maxSpeed) {
            const scale = maxSpeed / speed;
            this.velX *= scale;
            this.velY *= scale;
        }

        this.state.cx += this.velX * dt;
        this.state.cy += this.velY * dt;

        // 缩放弹簧（log 空间）
        const logCur = Math.log(this.state.zoom);
        const logTgt = Math.log(this.target.zoom);
        const idealLogSpd = (logTgt - logCur) * this.params.zoomApproach;
        const clampedLogSpd = Math.min(
            Math.max(idealLogSpd, -this.params.zoomMaxLogSpeed),
            this.params.zoomMaxLogSpeed
        );

        this.velLogZoom += (clampedLogSpd - this.velLogZoom) * this.params.zoomDirBlend * dt;
        this.state.zoom = Math.exp(logCur + this.velLogZoom * dt);

        return { ...this.state };
    }

    /** 判断相机是否到位 */
    isSettled(settleDist: number = 50, settleZoomRatio: number = 0.15): boolean {
        const dx = this.target.cx - this.state.cx;
        const dy = this.target.cy - this.state.cy;
        const distance = Math.hypot(dx, dy);

        const zoomRatio = this.state.zoom / this.target.zoom;
        const logZoomDiff = Math.abs(Math.log(zoomRatio));
        const zoomThreshold = Math.log(1 + settleZoomRatio);

        return distance < settleDist && logZoomDiff < zoomThreshold;
    }

    /** 获取当前状态 */
    getState(): CameraState {
        return { ...this.state };
    }

    /** 重置到指定状态 */
    reset(state: CameraState): void {
        this.state = { ...state };
        this.target = { ...state };
        this.velX = 0;
        this.velY = 0;
        this.velLogZoom = 0;
    }
}

/** 计算节点包围盒 */
export function calculateBoundingBox(
    nodes: Array<{ x: number; y: number }>
): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (nodes.length === 0) return null;

    let minX = nodes[0].x;
    let minY = nodes[0].y;
    let maxX = nodes[0].x;
    let maxY = nodes[0].y;

    for (let i = 1; i < nodes.length; i++) {
        const { x, y } = nodes[i];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    return { minX, minY, maxX, maxY };
}

/** 计算适配视口的缩放值 */
export function zoomToFit(
    bbox: { minX: number; minY: number; maxX: number; maxY: number },
    viewportWidth: number,
    viewportHeight: number,
    padding: number = 0.1
): number {
    const bboxWidth = bbox.maxX - bbox.minX;
    const bboxHeight = bbox.maxY - bbox.minY;

    if (bboxWidth <= 0 || bboxHeight <= 0) return 1;

    const effectiveWidth = viewportWidth * (1 - padding * 2);
    const effectiveHeight = viewportHeight * (1 - padding * 2);

    const scaleX = effectiveWidth / bboxWidth;
    const scaleY = effectiveHeight / bboxHeight;

    return Math.min(scaleX, scaleY);
}
