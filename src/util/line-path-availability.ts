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

/**
 * Returns whether assigning or creating a path needs an active subscription
 * in the current map-display context.
 */
export const requiresSubscriptionForLinePath = (type: LinePathType, mapEnabled: boolean): boolean =>
    !!linePaths[type].isPro || (mapEnabled ? DIAGRAM_NATIVE_LINE_PATHS.has(type) : MAP_NATIVE_LINE_PATHS.has(type));

export const canUseLinePath = (type: LinePathType, mapEnabled: boolean, isSubscriber: boolean): boolean =>
    isSubscriber || !requiresSubscriptionForLinePath(type, mapEnabled);

export const canUseLineStyle = (style: LineStyleType, isSubscriber: boolean): boolean =>
    style !== LineStyleType.Unknown && (isSubscriber || !lineStyles[style].isPro);

/** Authoring requires both a known path and a known, permitted style. */
export const canUseLine = (
    type: LinePathType,
    style: LineStyleType,
    mapEnabled: boolean,
    isSubscriber: boolean
): boolean =>
    (isLegacySimplePathCombination(type, style) || canUseLinePath(type, mapEnabled, isSubscriber)) &&
    canUseLineStyle(style, isSubscriber);

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
    const pathVisible =
        isSubscriber ||
        isLegacySimplePathCombination(attr.type, attr.style) ||
        !requiresSubscriptionForLinePath(attr.type, mapEnabled);
    const styleVisible = isSubscriber || !lineStyles[attr.style].isPro;
    return pathVisible && styleVisible;
};
