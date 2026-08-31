import React from 'react';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { CityCode, Theme } from '../../../constants/constants';
import ThemeButton from '../theme-button';
import RmgPaletteAppClip from '../rmg-palette-app-clip';

/**
 * TimelineColorPicker wraps the project's ThemeButton + RmgPaletteAppClip
 * to let users pick a simple hex color (bgColor) via the project's custom palette.
 */
interface TimelineColorPickerProps {
    hexColor: string;
    onChange: (hex: string) => void;
}

export default function TimelineColorPicker({ hexColor, onChange }: TimelineColorPickerProps) {
    const [paletteOpen, setPaletteOpen] = React.useState(false);

    // Use CityCode.Other + 'other' so rmg-palette treats this as a custom color:
    // the city/line pickers won't mis-highlight a fake metro line, and the current
    // hex is pre-filled (auto-selected) in the colour input when the clip opens.
    const placeholderTheme: Theme = [CityCode.Other, 'other', hexColor as `#${string}`, MonoColour.white];

    const handleSelect = (theme: Theme) => {
        onChange(theme[2]); // Extract the hex color
        setPaletteOpen(false);
    };

    return (
        <>
            <ThemeButton theme={placeholderTheme} onClick={() => setPaletteOpen(true)} />
            <RmgPaletteAppClip
                isOpen={paletteOpen}
                onClose={() => setPaletteOpen(false)}
                defaultTheme={placeholderTheme}
                onSelect={handleSelect}
            />
        </>
    );
}
