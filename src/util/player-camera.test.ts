import { describe, expect, it } from 'vitest';
import { PlayerCamera } from './player-camera';

describe('PlayerCamera', () => {
    it('立即对齐到目标并清除镜头移动速度', () => {
        const camera = new PlayerCamera({ cx: 0, cy: 0, zoom: 1 });
        camera.setTarget(100, 200, 2);
        camera.update(1 / 60);

        camera.snapToTarget();

        expect(camera.getState()).toEqual({ cx: 100, cy: 200, zoom: 2 });
        expect(camera.update(1 / 60)).toEqual({ cx: 100, cy: 200, zoom: 2 });
    });
});
