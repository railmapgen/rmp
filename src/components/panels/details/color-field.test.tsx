import { fireEvent, screen } from '@testing-library/react';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { describe, expect, it, vi } from 'vitest';
import { CityCode, Theme } from '../../../constants/constants';
import { LineStyleType } from '../../../constants/lines';
import { render } from '../../../test-utils';
import { ColorField, ColorFieldContext } from './color-field';

const NEXT_THEME: Theme = [CityCode.Other, 'next', '#123456', MonoColour.white];

vi.mock('../../../util/hooks', () => ({
    usePaletteTheme: ({ theme, onThemeApplied }: { theme: Theme; onThemeApplied?: (theme: Theme) => void }) => ({
        theme,
        requestThemeChange: () => onThemeApplied?.(NEXT_THEME),
    }),
}));

describe('ColorField', () => {
    it('returns the complete updated attributes through its specific-attributes context', () => {
        const handleAttrsUpdate = vi.fn();
        const currentTheme: Theme = [CityCode.Other, 'current', '#654321', MonoColour.white];

        render(
            <ColorFieldContext.Provider
                value={{
                    type: LineStyleType.SingleColor,
                    attrs: { color: currentTheme, width: 8 },
                    handleAttrsUpdate,
                }}
            >
                <ColorField type={LineStyleType.SingleColor} defaultTheme={currentTheme} />
            </ColorFieldContext.Provider>
        );

        fireEvent.click(screen.getByRole('button'));

        expect(handleAttrsUpdate).toHaveBeenCalledWith({ color: NEXT_THEME, width: 8 });
    });
});
