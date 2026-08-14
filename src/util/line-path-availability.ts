import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import type { EdgeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';

/**
 * Paths whose geometry is native to a geographic map.
 *
 * These sets express the one contextual subscription rule; they are not
 * persisted project categories and do not alter graph data.
 */
export const MAP_NATIVE_LINE_PATHS: ReadonlySet<LinePathType> = new Set([LinePathType.Bezier, LinePathType.Freeform]);

/** Paths whose geometry is native to a schematic diagram. */
export const DIAGRAM_NATIVE_LINE_PATHS: ReadonlySet<LinePathType> = new Set([
    LinePathType.Diagonal,
    LinePathType.Perpendicular,
    LinePathType.RotatePerpendicular,
    LinePathType.RayGuided,
]);

/**
 * Preserve the legacy free Simple pairings that predate the contextual path policy.
 *
 * This exception must remain pair-specific: Simple itself is still statically Pro,
 * and the paired style must still pass the independent style subscription check.
 */
const legacySimplePathAvailableStyles: ReadonlySet<LineStyleType> = new Set([
    LineStyleType.ShmetroVirtualInt,
    LineStyleType.GzmtrVirtualInt,
    LineStyleType.River,
    LineStyleType.MTRPaidArea,
    LineStyleType.MTRUnpaidArea,
    LineStyleType.MRTTapeOut,
]);

const isLegacySimplePathCombination = (type: LinePathType, style: LineStyleType): boolean =>
    type === LinePathType.Simple && legacySimplePathAvailableStyles.has(style);

/** The single authoring-access check for a path/style pair. */
export const canUseLine = (
    type: LinePathType,
    style: LineStyleType,
    mapEnabled: boolean,
    isSubscriber: boolean
): boolean => {
    if (style === LineStyleType.Unknown) return false;

    const contextRestrictedPaths = mapEnabled ? DIAGRAM_NATIVE_LINE_PATHS : MAP_NATIVE_LINE_PATHS;
    const pathAllowed =
        isLegacySimplePathCombination(type, style) ||
        isSubscriber ||
        (!linePaths[type].isPro && !contextRestrictedPaths.has(type));
    const styleAllowed = isSubscriber || !lineStyles[style].isPro;
    return pathAllowed && styleAllowed;
};

/** Authoring a line also requires the selected style to support its path geometry. */
export const canUseLineCombination = (
    type: LinePathType,
    style: LineStyleType,
    mapEnabled: boolean,
    isSubscriber: boolean
): boolean =>
    canUseLine(type, style, mapEnabled, isSubscriber) && lineStyles[style].metadata.supportLinePathType.includes(type);

/** Apply the authoring policy to existing lines without mutating graph data. */
export const isLinePolicyVisible = (
    attr: Pick<EdgeAttributes, 'type' | 'style'>,
    mapEnabled: boolean,
    isSubscriber: boolean
): boolean => {
    const contextRestrictedPaths = mapEnabled ? DIAGRAM_NATIVE_LINE_PATHS : MAP_NATIVE_LINE_PATHS;
    const pathVisible =
        isSubscriber ||
        isLegacySimplePathCombination(attr.type, attr.style) ||
        (!linePaths[attr.type].isPro && !contextRestrictedPaths.has(attr.type));
    const styleVisible = isSubscriber || !lineStyles[attr.style].isPro;
    return pathVisible && styleVisible;
};
