import { describe, expect, it } from 'vitest';
import { PlayerAnimator } from './player-animator';

describe('PlayerAnimator', () => {
    it('seek 后立即使用目标帧的相机视口', () => {
        const container = document.createElement('div');
        container.innerHTML = `
            <svg viewBox="0 0 100 100">
                <g id="line_1"><path d="M 0 0 L 100 0" /></g>
            </svg>
        `;
        Object.defineProperty(container, 'getBoundingClientRect', {
            value: () => ({ width: 100, height: 100 }),
        });
        const path = container.querySelector('path')!;
        Object.assign(path, {
            getTotalLength: () => 100,
            getPointAtLength: (length: number) => ({ x: length, y: 0 }),
        });

        let camera: { cx: number; cy: number; zoom: number } | undefined;
        const animator = new PlayerAnimator(container, {
            schedule: [{ type: 'segment', startMs: 0, endMs: 1000, edgeId: 'line_1', edgeAction: 'add' }],
            diffs: [],
            totalDuration: 1000,
            onProgress: state => {
                camera = state.camera;
            },
        });

        animator.seek(500);

        expect(camera).toEqual({ cx: 50, cy: 0, zoom: 0.8 });
        animator.destroy();
    });
});
