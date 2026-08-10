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

const KNOWN_LINE_PATH_TYPES: readonly unknown[] = Object.values(LinePathType);
const KNOWN_LINE_STYLE_TYPES: readonly unknown[] = Object.values(LineStyleType);

export const isKnownLinePathType = (type: unknown): type is LinePathType => KNOWN_LINE_PATH_TYPES.includes(type);

export const isKnownLineStyleType = (style: unknown): style is LineStyleType => KNOWN_LINE_STYLE_TYPES.includes(style);

const isLegacySimplePathCombination = (type: unknown, style: unknown): style is LineStyleType =>
    type === LinePathType.Simple && isKnownLineStyleType(style) && legacySimplePathAvailableStyles.has(style);

/**
 * Returns whether assigning or creating a known path needs an active
 * subscription in the current map-display context.
 */
export const requiresSubscriptionForLinePath = (type: LinePathType, mapEnabled: boolean): boolean =>
    !!linePaths[type].isPro || (mapEnabled ? DIAGRAM_NATIVE_LINE_PATHS.has(type) : MAP_NATIVE_LINE_PATHS.has(type));

export const canUseLinePath = (type: unknown, mapEnabled: boolean, isSubscriber: boolean): type is LinePathType =>
    isKnownLinePathType(type) && (isSubscriber || !requiresSubscriptionForLinePath(type, mapEnabled));

export const canUseLineStyle = (style: unknown, isSubscriber: boolean): style is LineStyleType =>
    isKnownLineStyleType(style) && style !== LineStyleType.Unknown && (isSubscriber || !lineStyles[style].isPro);

/** Authoring requires both a known path and a known, permitted style. */
export const canUseLine = (type: unknown, style: unknown, mapEnabled: boolean, isSubscriber: boolean): boolean =>
    (isLegacySimplePathCombination(type, style) || canUseLinePath(type, mapEnabled, isSubscriber)) &&
    canUseLineStyle(style, isSubscriber);

/**
 * Existing unknown paths/styles remain visible for fallback rendering, but
 * cannot be newly authored through `canUseLine`.
 */
export const isLinePolicyVisible = (
    attr: Pick<EdgeAttributes, 'type' | 'style'>,
    mapEnabled: boolean,
    isSubscriber: boolean
): boolean => {
    const pathVisible =
        !isKnownLinePathType(attr.type) ||
        isSubscriber ||
        isLegacySimplePathCombination(attr.type, attr.style) ||
        !requiresSubscriptionForLinePath(attr.type, mapEnabled);
    const styleVisible = !isKnownLineStyleType(attr.style) || isSubscriber || !lineStyles[attr.style].isPro;
    return pathVisible && styleVisible;
};
