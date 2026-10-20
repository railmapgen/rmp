import { afterEach, describe, expect, it } from 'vitest';
import { getRmpWatermarkUrl } from './watermark';

describe('getRmpWatermarkUrl', () => {
    const originalLocation = window.location;

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true,
            configurable: true,
        });
    });

    it('returns the default railmapgen.org URL when running locally or on custom domain', () => {
        Object.defineProperty(window, 'location', {
            value: { origin: 'http://localhost:5173' },
            writable: true,
            configurable: true,
        });
        expect(getRmpWatermarkUrl()).toBe('https://railmapgen.org/?app=rmp');
    });

    it('returns the GitHub Pages URL when running on github.io', () => {
        Object.defineProperty(window, 'location', {
            value: { origin: 'https://railmapgen.github.io' },
            writable: true,
            configurable: true,
        });
        expect(getRmpWatermarkUrl()).toBe('https://railmapgen.github.io/?app=rmp');
    });

    it('returns the GitLab Pages URL when running on gitlab.io', () => {
        Object.defineProperty(window, 'location', {
            value: { origin: 'https://railmapgen.gitlab.io' },
            writable: true,
            configurable: true,
        });
        expect(getRmpWatermarkUrl()).toBe('https://railmapgen.gitlab.io/?app=rmp');
    });
});
