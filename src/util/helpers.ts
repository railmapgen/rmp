import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes, SnapLine } from '../constants/constants';
import { Size } from './hooks';

export const getMousePosition = (e: React.MouseEvent) => {
    const bbox = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bbox.left;
    const y = e.clientY - bbox.top;
    // console.log(e.clientX, bbox.left, e.clientY, bbox.top, x, y);
    return { x, y };
};

/**
 * Translate the position relative to the viewport to the svg user coordinate system.
 * @param x The x of the pointer.
 * @param y The y of the pointer.
 * @param svgViewBoxZoom The zoom level of the svg view box.
 * @param svgViewBoxMin The top-left coordinate of the svg view box.
 * @returns The coordinate of the svg canvas.
 */
export const pointerPosToSVGCoord = (
    x: number,
    y: number,
    svgViewBoxZoom: number,
    svgViewBoxMin: { x: number; y: number }
) => ({ x: (x * svgViewBoxZoom) / 100 + svgViewBoxMin.x, y: (y * svgViewBoxZoom) / 100 + svgViewBoxMin.y });

/** Helper to auto-calculate decimal places from base value */
const calculateDecimals = (base: number): number => {
    if (base >= 1) return 0;
    const baseString = base.toString().split('.')[1] || '';
    return baseString.replace(/0+$/, '').length; // Ignore trailing zeros
};

/**
 * Rounds a number to the nearest multiple of a specified base value, with optional decimal precision control.
 * e.g. roundToMultiple(114.514, 5) = 115
 *      roundToMultiple(114.514, 0.01) = 114.51
 * @param value The number to round
 * @param base The base multiple to round to (e.g., 5, 0.1, 0.25)
 * @returns The rounded value with precise decimal handling
 */
export const roundToMultiple = (value: number, base: number): number => {
    // round to nearest base multiple
    const intermediate = Math.round(value / base) * base;
    // apply decimal precision control
    const factor = Math.pow(10, calculateDecimals(base));
    return Math.round(intermediate * factor) / factor;
};

/**
 * Calculate the canvas size from DOMRect of each node.
 * @param graph The graph.
 * @param svgViewBoxMin The viewport relative to each DOMRect.
 * @returns The canvas size.
 */
export const calculateCanvasSize = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    let [xMin, yMin, xMax, yMax] = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE];

    graph.forEachNode((node, _) => {
        const nodeElm = document.getElementById(node) as SVGSVGElement | null;
        if (nodeElm) {
            const rect = transformedBoundingBox(nodeElm);
            xMin = Math.min(rect.x, xMin);
            yMin = Math.min(rect.y, yMin);
            xMax = Math.max(rect.x + rect.width, xMax);
            yMax = Math.max(rect.y + rect.height, yMax);
        }
    });

    xMin -= 50;
    yMin -= 50;
    xMax += 100;
    yMax += 100;

    return { xMin, yMin, xMax, yMax };
};

/**
 * Return the canvas size with some margin for header and tools.
 */
export const getCanvasSize = (size: Size) => ({
    width: (size.width ?? 720) - 40,
    height: (size.height ?? 1280) - 40,
});

/**
 * Return the svg viewpoint size from the canvas size returned in `getCanvasSize`.
 */
export const getViewpointSize = (
    svgViewBoxMin: { x: number; y: number },
    svgViewBoxZoom: number,
    width: number,
    height: number
) => ({
    xMin: svgViewBoxMin.x,
    yMin: svgViewBoxMin.y,
    xMax: (width * svgViewBoxZoom) / 100 + svgViewBoxMin.x,
    yMax: (height * svgViewBoxZoom) / 100 + svgViewBoxMin.y,
});

export const makeSnapLinesPath = (
    p: SnapLine,
    viewpointSize: ReturnType<typeof getViewpointSize>
): [number, number, number, number] => {
    const { xMin, yMin, xMax, yMax } = viewpointSize;
    if (p.a === 0) {
        return [xMin, xMax, -p.c / p.b, -p.c / p.b];
    } else if (p.b === 0) {
        return [-p.c / p.a, -p.c / p.a, yMin, yMax];
    } else {
        const k = -p.a / p.b;
        const b = -p.c / p.b;
        return [xMin, xMax, k * xMin + b, k * xMax + b];
    }
};

/**
 * Calculate the bounding box of the current element, with respect to its own transformation attribute.
 *
 * The SVGRect returned by `SVGGraphicsElement.getBBox()` will be irrespective of any
 * transformation attribute applied to it or the parent elements.
 * https://developer.mozilla.org/en-US/docs/Web/API/SVGGraphicsElement/getBBox#return_value
 *
 * This helper function uses the polyfill of `SVGGraphicsElement.getTransformToElement()`.
 * It gets the transformation matrix that transforms from the user coordinate system on the
 * current element to the user coordinate system on the specified target element.
 *
 * With the _transformed_ matrix, we then apply it back to the current element and thus
 * get the SVGRect that respect the transformation attribute applied to it.
 *
 * Reference:
 * https://stackoverflow.com/questions/10623809/get-bounding-box-of-element-accounting-for-its-transform
 *
 * It is clear we can ask every contributor to wrap their nodes with another <g id={id}>...</g>,
 * so that when getBBox is called, the SVGRect will be what we want as all transformations
 * are applied and calculated in the inner <g transform={...}>...</g>.
 * However, it will be complicated to make everyone and the docs right, so let this fixes everything.
 *
 * @param el The element to getBBox.
 * @returns The SVGRect with respect to its own transformation attribute.
 */
const transformedBoundingBox = (el: SVGSVGElement) => {
    const bb = el.getBBox();
    const svg = el.ownerSVGElement!;
    const m = (el.parentNode! as SVGSVGElement).getScreenCTM()!.inverse().multiply(el.getScreenCTM()!);

    // Create an array of all four points for the original bounding box
    const pts = [svg.createSVGPoint(), svg.createSVGPoint(), svg.createSVGPoint(), svg.createSVGPoint()];
    pts[0].x = bb.x;
    pts[0].y = bb.y;
    pts[1].x = bb.x + bb.width;
    pts[1].y = bb.y;
    pts[2].x = bb.x + bb.width;
    pts[2].y = bb.y + bb.height;
    pts[3].x = bb.x;
    pts[3].y = bb.y + bb.height;

    // Transform each into the space of the parent, and calculate the min/max points from that.
    let [xMin, yMin, xMax, yMax] = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE];
    pts.forEach(pt => {
        pt = pt.matrixTransform(m);
        xMin = Math.min(xMin, pt.x);
        xMax = Math.max(xMax, pt.x);
        yMin = Math.min(yMin, pt.y);
        yMax = Math.max(yMax, pt.y);
    });

    // Update the bounding box with the new values.
    bb.x = xMin;
    bb.width = xMax - xMin;
    bb.y = yMin;
    bb.height = yMax - yMin;
    return bb;
};

export const isMacClient = navigator.platform.startsWith('Mac');

export const shuffle = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

export const createHash = async (data: string, algorithm = 'SHA-256') => {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest(algorithm, encodedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
};

export const getRandomHexColor = (): `#${string}` => {
    const color = Math.floor(Math.random() * 0xffffff);
    return `#${color.toString(16).padStart(6, '0')}`;
};

export const getContrastingColor = (hex: `#${string}`): MonoColour => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? MonoColour.black : MonoColour.white;
};
