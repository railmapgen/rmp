import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
    loadFont: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@railmapgen/rmg-runtime', () => ({ default: runtime }));

import { loadFont, TextLanguage } from './fonts';

describe('loadFont', () => {
    beforeEach(() => runtime.loadFont.mockClear());

    it('resolves bundled font files from the application base instead of the current route', async () => {
        await loadFont(TextLanguage.mrt);
        await loadFont(TextLanguage.tube);

        expect(runtime.loadFont).toHaveBeenNthCalledWith(1, 'LTAIdentity', {
            configs: [
                {
                    source: 'url("/rmp/fonts/LTAIdentity-Medium.ttf")',
                    descriptors: { display: 'swap' },
                },
            ],
        });
        expect(runtime.loadFont).toHaveBeenNthCalledWith(2, 'Railway', {
            configs: [
                {
                    source: 'url("/rmp/fonts/Railway-PlyE.otf")',
                    descriptors: { display: 'swap' },
                },
            ],
        });
    });
});
