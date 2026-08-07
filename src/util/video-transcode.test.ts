import { describe, expect, it } from 'vitest';
import { getWebMToMP4Args } from './video-transcode';

describe('video transcode', () => {
    it('transcodes WebM to a broadly compatible H.264 MP4', () => {
        expect(getWebMToMP4Args('input.webm', 'output.mp4')).toEqual([
            '-i',
            'input.webm',
            '-an',
            '-c:v',
            'libx264',
            '-preset',
            'veryfast',
            '-crf',
            '18',
            '-pix_fmt',
            'yuv420p',
            '-movflags',
            '+faststart',
            'output.mp4',
        ]);
    });
});
