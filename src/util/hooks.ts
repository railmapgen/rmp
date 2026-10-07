import { logger } from '@railmapgen/rmg-runtime';
import { LanguageCode, Translation } from '@railmapgen/rmg-translate';
import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Theme } from '../constants/constants';
import { LineDefinition } from '../constants/line-definitions';
import { useRootDispatch, useRootSelector, useRootStore } from '../redux';
import { ParamGraph, refreshLineDefinitions } from '../redux/param/param-slice';
import { openPaletteAppClip } from '../redux/runtime/runtime-slice';
import { loadFont } from './fonts';
import { getLineTopology, getUnassignedLineSections, reconcileLineDefinitions } from './line-definitions';
import { getLineExportsAsync, LineExport, yieldLineCalculation } from './line-export';

/** Request a fresh projection on open, and discard work for closed panels or superseded graphs. */
export const useLineInformation = (isOpen: boolean) => {
    const source = useRootSelector(state => state.param.present.graph);
    const dispatch = useRootDispatch();
    const store = useRootStore();
    const calculated = useRef<ParamGraph | undefined>(undefined);
    const [result, setResult] = useState<{
        graph: ParamGraph;
        entries: LineExport[];
        unassigned: LineDefinition[];
        error?: string;
    }>();

    useEffect(() => {
        if (!isOpen) {
            calculated.current = undefined;
            setResult(undefined);
            return;
        }
        if (calculated.current === source) return;
        const controller = new AbortController();
        const calculate = async () => {
            try {
                await yieldLineCalculation(controller.signal);
                if (controller.signal.aborted) return;
                const graph = reconcileLineDefinitions(source);
                const entries = await getLineExportsAsync(graph, controller.signal);
                if (controller.signal.aborted || store.getState().param.present.graph !== source) return;
                dispatch(refreshLineDefinitions({ source, attributes: graph.attributes }));
                const current = store.getState().param.present.graph;
                const unassigned = getUnassignedLineSections(current).filter(
                    line => getLineTopology(current, line).stationIds.length >= 2
                );
                calculated.current = current;
                setResult({ graph: current, entries, unassigned });
            } catch (cause) {
                if (controller.signal.aborted) return;
                calculated.current = source;
                setResult({ graph: source, entries: [], unassigned: [], error: String(cause) });
            }
        };
        void calculate();
        return () => controller.abort();
    }, [isOpen, source, dispatch, store]);

    const isLoading = isOpen && (!result || result.graph !== source);
    return {
        graph: result?.graph ?? source,
        entries: result?.entries ?? [],
        unassigned: result?.unassigned ?? [],
        isLoading,
        error: result?.error,
    };
};

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
    useEffect(() => {
        setTheme(providedTheme ?? runtimeTheme);
    }, [providedTheme, runtimeTheme]);

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

/**
 * All in one place to load fonts based on used languages, should be attached only once in svg-wrapper.
 *
 * Of course, you are free to load fonts by manually dispatching loadFont/loadFonts actions,
 * here is only a convenience hook to load all fonts by node types in the graph.
 * However, manually dispatching loadFont/loadFonts actions in every component instance may
 * cause performance issues. So use this whenever possible unless your component
 * needs to load fonts dynamically such as the `Text` component.
 */
export const useFonts = () => {
    const { languages } = useRootSelector(state => state.fonts);
    const {
        refresh: { nodes: refreshNodes },
    } = useRootSelector(state => state.runtime);

    useEffect(() => {
        for (const lang of languages) {
            loadFont(lang);
        }
    }, [refreshNodes, languages]);
};

/**
 * Prevent the browser from interpreting Ctrl/Cmd + wheel as page zoom on the
 * provided SVG element, so the application can use the same gesture for canvas zoom.
 */
export const usePreventBrowserZoom = (svgRef: RefObject<SVGSVGElement | null>) => {
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const preventBrowserZoom = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
        };

        svg.addEventListener('wheel', preventBrowserZoom, { passive: false });
        return () => {
            svg.removeEventListener('wheel', preventBrowserZoom);
        };
    }, [svgRef]);
};

export const useScreenOrientation = () => {
    const [orientation, setOrientation] = useState('landscape' as 'landscape' | 'portrait');

    useEffect(() => {
        if (!screen.orientation) {
            logger.warn('screen.orientation API is not supported in this browser.');
            return;
        }

        const getOrientation = () => {
            if (screen.orientation.type.startsWith('portrait')) {
                return 'portrait';
            }
            return 'landscape';
        };

        setOrientation(getOrientation());

        const handleOrientationChange = () => {
            setOrientation(getOrientation());
        };
        screen.orientation.addEventListener('change', handleOrientationChange);

        return () => {
            screen.orientation.removeEventListener('change', handleOrientationChange);
        };
    }, []);

    return orientation;
};
