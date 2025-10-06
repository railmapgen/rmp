import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { AttributesWithColor, dynamicColorInjection } from '../components/panels/details/color-field';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId, Theme } from '../constants/constants';

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

/**
 * Find all themes in selected items or in map
 */
export const findThemes = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: NodeId[],
    edges: LineId[]
) => {
    const colorList: Theme[] = [];
    const colorSet: Set<string> = new Set<string>();
    nodes.forEach(id => {
        const thisType = graph.getNodeAttributes(id).type;
        const attrs = graph.getNodeAttribute(id, thisType);
        if ((attrs as AttributesWithColor)['color'] !== undefined) {
            const color = (attrs as AttributesWithColor)['color'];
            if (!colorSet.has(color.toString())) {
                colorList.push(color);
                colorSet.add(color.toString());
            }
        }
    });
    edges
        .filter(edge => dynamicColorInjection.has(graph.getEdgeAttribute(edge, 'style')))
        .forEach(edge => {
            const attr = graph.getEdgeAttributes(edge);
            const color = (attr[attr.style] as AttributesWithColor).color;
            if (!colorSet.has(color.toString())) {
                colorList.push(color);
                colorSet.add(color.toString());
            }
        });
    return colorList;
};

/**
 * Calculate a dynamic contrast color based on a background hex color and opacity.
 * @param hexColor - Input hex color string, e.g., "#FF0000".
 * @param opacity - Opacity value between 0.0 and 1.0.
 * @returns A hex color string with adjusted brightness and saturation.
 */
export const getDynamicContrastColor = (hexColor: string, opacity: number): string => {
    // 1. Convert hex to RGB, normalized to [0,1]
    let r = 0,
        g = 0,
        b = 0;
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hexColor = hexColor.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    if (result) {
        r = parseInt(result[1], 16) / 255;
        g = parseInt(result[2], 16) / 255;
        b = parseInt(result[3], 16) / 255;
    }

    // 2. Convert RGB to HSL
    const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    let h = 0,
        s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    // 3. Compute inverted lightness
    const invertedL = 1 - l;

    // 4. Define adjustment scales for lightness and saturation
    const lightnessScale = 0.8; // scale factor for lightness adjustment
    const saturationScale = 0.5; // scale factor for saturation adjustment

    const opacityFactor = opacity - 0.5; // maps opacity [0,1] to [-0.5,0.5]

    // 5. Compute final lightness and saturation
    let finalL = invertedL + opacityFactor * lightnessScale;
    // Higher opacity decreases saturation, lower opacity increases saturation
    let finalS = s - opacityFactor * saturationScale;

    // 6. Clamp final values to the [0, 1] range
    finalL = Math.max(0, Math.min(1, finalL));
    finalS = Math.max(0, Math.min(1, finalS));

    // 7. Convert HSL back to RGB using finalS and finalL
    let r_new = finalL,
        g_new = finalL,
        b_new = finalL;
    if (finalS !== 0) {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = finalL < 0.5 ? finalL * (1 + finalS) : finalL + finalS - finalL * finalS;
        const p = 2 * finalL - q;
        r_new = hue2rgb(p, q, h + 1 / 3);
        g_new = hue2rgb(p, q, h);
        b_new = hue2rgb(p, q, h - 1 / 3);
    }

    // 8. Convert RGB to hex string
    const toHex = (c: number) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r_new)}${toHex(g_new)}${toHex(b_new)}`;
};
