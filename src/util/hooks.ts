import { LanguageCode, Translation } from '@railmapgen/rmg-translate';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useRootSelector } from '../redux';
import { openPaletteAppClip } from '../redux/runtime/runtime-slice';
import { Theme } from '../constants/constants';

// Define general type for useWindowSize hook, which includes width and height
export interface Size {
    width: number | undefined;
    height: number | undefined;
}

// Hook
export const useWindowSize = (): Size => {
    // Initialize state with undefined width/height so server and client renders match
    // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
    const [windowSize, setWindowSize] = useState<Size>({
        width: undefined,
        height: undefined,
    });

    useEffect(() => {
        // Handler to call on window resize
        function handleResize() {
            // Set window width/height to state
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Call handler right away so state gets updated with initial window size
        handleResize();

        // Remove event listener on cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []); // Empty array ensures that effect is only run on mount

    return windowSize;
};

export default function useTranslatedName(): (name: Translation) => string {
    const { i18n } = useTranslation();

    return (name: Translation) => {
        return (
            i18n.languages.map(lang => name[lang as LanguageCode]).find(name => name !== undefined) ??
            name.en ??
            '(Translation Error)'
        );
    };
}

interface UsePaletteThemeOptions {
    /**
     * The theme displayed on the ThemeButton.
     * If not provided, the theme from the runtime store will be used.
     */
    theme?: Theme;
    /**
     * This callback is called when the theme is selected.
     * @param theme The new theme selected from the palette app clip.
     */
    onThemeApplied?: (theme: Theme) => void;
}
/**
 * Use this hook with `ThemeButton` to open the palette app clip and change the theme.
 */
export const usePaletteTheme = (options?: UsePaletteThemeOptions) => {
    const { theme: providedTheme, onThemeApplied } = options ?? {};
    const {
        theme: runtimeTheme, // The default/initial theme from the store
        paletteAppClip: { input, output }, // State related to the app clip interaction
    } = useRootSelector(state => state.runtime);

    const dispatch = useDispatch();

    const [theme, setTheme] = useState(providedTheme ?? runtimeTheme);
    const [isThemeRequested, setIsThemeRequested] = useState(false);

    useEffect(() => {
        if (!isThemeRequested) {
            // theme change is not requested by this component, ignore
            return;
        }

        if (output) {
            // receive theme from the palette app clip, update the color
            setTheme(output);
            setIsThemeRequested(false);

            if (onThemeApplied) {
                onThemeApplied(output);
            }
        } else if (!input) {
            // theme change is canceled, reset the state
            setIsThemeRequested(false);
        }
    }, [input, output, isThemeRequested]);

    const requestThemeChange = useCallback(() => {
        setIsThemeRequested(true);
        dispatch(openPaletteAppClip(theme));
    }, [dispatch, theme]);

    return { theme, requestThemeChange };
};
