const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export const MAP_ATTRIBUTION_URL = 'https://www.openstreetmap.org/copyright';
export const MAP_ATTRIBUTION_EXPORT_URL = 'openstreetmap.org/copyright';

const DEFAULT_MAP_ATTRIBUTION = '© OpenStreetMap contributors';
const ATTRIBUTION_FONT_SIZE = 12;
const ATTRIBUTION_HEIGHT = 16;
const ATTRIBUTION_PADDING_X = 5;

/**
 * Keeps older tile manifests compatible with OSM's customary credit.
 *
 * Published manifests used to repeat the licence beside the provider name. The
 * linked copyright page now carries that detail, while unknown provider text is
 * preserved because it may contain additional attribution requirements.
 */
export const normalizeMapAttribution = (value?: string) => {
    const attribution = value?.trim() ?? '';
    if (!attribution) return DEFAULT_MAP_ATTRIBUTION;
    if (/^©?\s*OpenStreetMap contributors(?:\s*[/,]\s*ODbL(?:\s*1\.0)?)?$/i.test(attribution)) {
        return DEFAULT_MAP_ATTRIBUTION;
    }
    return attribution.startsWith('©') ? attribution : `© ${attribution}`;
};

/**
 * Estimates text width only when SVG layout is unavailable, such as a detached
 * export in a browser or jsdom. Live canvases use the browser's font metrics so
 * arbitrary manifest credits are not clipped by the background.
 */
const getAttributionTextWidth = (text: SVGTextElement) => {
    try {
        const measuredWidth = text.getComputedTextLength();
        if (Number.isFinite(measuredWidth) && measuredWidth > 0) return measuredWidth;
    } catch {
        // Detached SVG implementations may expose the method without providing layout metrics.
    }

    return Array.from(text.textContent ?? '').reduce((width, character) => {
        if (character === ' ') return width + 3.5;
        return width + (character.codePointAt(0)! > 0xff ? ATTRIBUTION_FONT_SIZE : 6.5);
    }, 0);
};

/**
 * Updates both the visible credit and its background as one operation so text
 * from a future manifest cannot silently overflow the legibility treatment.
 */
export const setMapAttributionText = (attribution: SVGGElement, value?: string) => {
    const text = attribution.querySelector<SVGTextElement>('[data-map-attribution-text]');
    const background = attribution.querySelector<SVGRectElement>('[data-map-attribution-background]');
    if (!text || !background) throw new Error('Map attribution structure is incomplete');

    text.textContent = normalizeMapAttribution(value);
    background.setAttribute('width', String(Math.ceil(getAttributionTextWidth(text) + ATTRIBUTION_PADDING_X * 2)));
};

/**
 * Creates a self-contained SVG attribution control that remains serializable for
 * image export. Only this link opts back into pointer handling; map tiles stay
 * transparent to editor gestures.
 */
export const createMapAttribution = () => {
    const attribution = document.createElementNS(SVG_NAMESPACE, 'g');
    attribution.dataset.mapAttribution = '';

    const link = document.createElementNS(SVG_NAMESPACE, 'a');
    link.setAttribute('href', MAP_ATTRIBUTION_URL);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.style.cursor = 'pointer';
    link.style.pointerEvents = 'auto';

    /**
     * The canvas listens for gestures on its outer SVG. Let the link perform its
     * normal navigation without also starting a pan or changing selection.
     */
    link.addEventListener('pointerdown', event => event.stopPropagation());
    link.addEventListener('click', event => event.stopPropagation());

    const background = document.createElementNS(SVG_NAMESPACE, 'rect');
    background.dataset.mapAttributionBackground = '';
    background.setAttribute('y', String(-ATTRIBUTION_HEIGHT));
    background.setAttribute('height', String(ATTRIBUTION_HEIGHT));
    background.setAttribute('rx', '2');
    background.setAttribute('fill', '#fff');
    background.setAttribute('fill-opacity', '0.85');

    const text = document.createElementNS(SVG_NAMESPACE, 'text');
    text.dataset.mapAttributionText = '';
    text.setAttribute('x', String(ATTRIBUTION_PADDING_X));
    text.setAttribute('y', '-3');
    text.setAttribute('fill', '#222');
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('font-size', String(ATTRIBUTION_FONT_SIZE));

    link.append(background, text);
    attribution.append(link);
    setMapAttributionText(attribution, DEFAULT_MAP_ATTRIBUTION);
    return attribution;
};

/**
 * Positions a fixed-size local control in graph coordinates. Scaling the group
 * by the viewport unit counteracts the surrounding map transform, keeping its
 * screen size stable without recalculating every child attribute.
 */
export const positionMapAttribution = (attribution: SVGGElement, x: number, y: number, scale = 1) => {
    attribution.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
};
