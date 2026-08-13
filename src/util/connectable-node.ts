import type { NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { STATION_TYPE_VALUES, StationType } from '../constants/stations';

/** Miscellaneous node definitions accepted as line endpoints by the canvas interaction layer. */
export const CONNECTABLE_MISC_NODE_TYPES: ReadonlySet<MiscNodeType> = new Set([
    MiscNodeType.Virtual,
    MiscNodeType.Master,
    MiscNodeType.Fill,
    MiscNodeType.LondonArrow,
    MiscNodeType.ChongqingRTNumLineBadge2021,
    MiscNodeType.ChongqingRTTextLineBadge2021,
    MiscNodeType.ChengduRTLineBadge,
    MiscNodeType.GzmtrLineBadge,
]);

/**
 * Keeps line creation and node editor overlays on one definition of a connectable node type.
 *
 * Every station is connectable. Miscellaneous nodes opt in explicitly because many of them are annotations rather
 * than graph junctions, even when their rendered SVG happens to contain pointer targets.
 */
export const isConnectableNodeType = (type: NodeType): boolean =>
    STATION_TYPE_VALUES.has(type as StationType) || CONNECTABLE_MISC_NODE_TYPES.has(type as MiscNodeType);
