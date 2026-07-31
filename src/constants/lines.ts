/* eslint-disable import/order */
import type { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { AttrsProps, EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from './constants';
import type { SimplePathAttributes } from '../components/svgs/lines/paths/simple';
import type { DiagonalPathAttributes } from '../components/svgs/lines/paths/diagonal';
import type { PerpendicularPathAttributes } from '../components/svgs/lines/paths/perpendicular';
import type { RotatePerpendicularPathAttributes } from '../components/svgs/lines/paths/rotate-perpendicular';
import type { RayGuidedPathAttributes } from '../components/svgs/lines/paths/ray-guided';
import type { BezierPathAttributes } from '../components/svgs/lines/paths/bezier-model';
import type { FreeformPathAttributes } from '../components/svgs/lines/paths/freeform-model';
import type { SingleColorAttributes } from '../components/svgs/lines/styles/single-color';
import type { GenericAttributes } from '../components/svgs/lines/styles/generic';
import type { UnknownLineAttributes } from '../components/svgs/lines/styles/unknown';
import type { ShmetroVirtualIntAttributes } from '../components/svgs/lines/styles/shmetro-virtual-int';
import type { ShanghaiSuburbanRailwayAttributes } from '../components/svgs/lines/styles/shanghai-suburban-railway';
import type { GzmtrVirtualIntAttributes } from '../components/svgs/lines/styles/gzmtr-virtual-int';
import type { ChinaRailwayAttributes } from '../components/svgs/lines/styles/china-railway';
import type { BjsubwaySingleColorAttributes } from '../components/svgs/lines/styles/bjsubway-single-color';
import type { BjsubwayTramAttributes } from '../components/svgs/lines/styles/bjsubway-tram';
import type { BjsubwayDottedAttributes } from '../components/svgs/lines/styles/bjsubway-dotted';
import type { DualColorAttributes } from '../components/svgs/lines/styles/dual-color';
import type { RiverAttributes } from '../components/svgs/lines/styles/river';
import type { MTRRaceDaysAttributes } from '../components/svgs/lines/styles/mtr-race-day';
import type { MTRLightRailAttributes } from '../components/svgs/lines/styles/mtr-light-rail';
import type { MTRUnpaidAreaAttributes } from '../components/svgs/lines/styles/mtr-unpaid-area';
import type { MTRPaidAreaAttributes } from '../components/svgs/lines/styles/mtr-paid-area';
import type { MRTUnderConstructionAttributes } from '../components/svgs/lines/styles/mrt-under-construction';
import type { MRTSentosaExpressAttributes } from '../components/svgs/lines/styles/mrt-sentosa-express';
import type { MRTTapeOutAttributes } from '../components/svgs/lines/styles/mrt-tape-out';
import type { JREastSingleColorAttributes } from '../components/svgs/lines/styles/jr-east-single-color';
import type { JREastSingleColorPatternAttributes } from '../components/svgs/lines/styles/jr-east-single-color-pattern';
import type { LRTSingleColorAttributes } from '../components/svgs/lines/styles/lrt-single-color';
import type { LondonTubeTerminalAttributes } from '../components/svgs/lines/styles/london-tube-terminal';
import type { LondonTubeInternalIntAttributes } from '../components/svgs/lines/styles/london-tube-internal-int';
import type { LondonTube10MinWalkAttributes } from '../components/svgs/lines/styles/london-tube-10-min-walk';
import type { LondonRailAttributes } from '../components/svgs/lines/styles/london-rail';
import type { LondonSandwichAttributes } from '../components/svgs/lines/styles/london-sandwich';
import type { LondonLutonAirportDARTAttributes } from '../components/svgs/lines/styles/london-DART';
import type { LondonIFSCloudCableCarAttributes } from '../components/svgs/lines/styles/london-ifs-cloud-cable-car';
import type { GuangdongIntercityRailwayAttributes } from '../components/svgs/lines/styles/guangdong-intercity-railway';
import type { GZMTRLoopAttributes } from '../components/svgs/lines/styles/gzmtr-loop';
import type { ChongqingRTLoopAttributes } from '../components/svgs/lines/styles/chongqingrt-loop';
import type { ChongqingRTLineBadgeAttributes } from '../components/svgs/lines/styles/chongqingrt-line-badge';
import type { ChengduRTOutsideFareGatesAttributes } from '../components/svgs/lines/styles/chengdurt-outside-fare-gates';
import type { ShinkansenAttributes } from '../components/svgs/lines/styles/shinkansen';
import type { Path, PathPoint } from './path';

export enum LinePathType {
    Diagonal = 'diagonal',
    Perpendicular = 'perpendicular',
    RotatePerpendicular = 'ro-perp',
    RayGuided = 'ray-guided',
    Simple = 'simple',
    Bezier = 'bezier',
    Freeform = 'freeform',
}

export interface ExternalLinePathAttributes {
    [LinePathType.Simple]?: SimplePathAttributes;
    [LinePathType.Diagonal]?: DiagonalPathAttributes;
    [LinePathType.Perpendicular]?: PerpendicularPathAttributes;
    [LinePathType.RotatePerpendicular]?: RotatePerpendicularPathAttributes;
    [LinePathType.RayGuided]?: RayGuidedPathAttributes;
    [LinePathType.Bezier]?: BezierPathAttributes;
    [LinePathType.Freeform]?: FreeformPathAttributes;
}

export enum LineStyleType {
    SingleColor = 'single-color',
    Generic = 'generic',
    Unknown = 'unknown',
    ShanghaiSuburbanRailway = 'sh-sub-rwy',
    ShmetroVirtualInt = 'shmetro-virtual-int',
    GzmtrVirtualInt = 'gzmtr-virtual-int',
    GZMTRLoop = 'gzmtr-loop',
    ChinaRailway = 'china-railway',
    BjsubwaySingleColor = 'bjsubway-single-color',
    BjsubwayTram = 'bjsubway-tram',
    BjsubwayDotted = 'bjsubway-dotted',
    DualColor = 'dual-color',
    River = 'river',
    MTRRaceDays = 'mtr-race-days',
    MTRLightRail = 'mtr-light-rail',
    MTRUnpaidArea = 'mtr-unpaid-area',
    MTRPaidArea = 'mtr-paid-area',
    MRTUnderConstruction = 'mrt-under-constr',
    MRTSentosaExpress = 'mrt-sentosa-express',
    MRTTapeOut = 'mrt-tape-out',
    JREastSingleColor = 'jr-east-single-color',
    JREastSingleColorPattern = 'jr-east-single-color-pattern',
    LRTSingleColor = 'lrt-single-color',
    LondonTubeTerminal = 'london-tube-terminal',
    LondonTubeInternalInt = 'london-tube-internal-int',
    LondonTube10MinWalk = 'london-tube-10-min-walk',
    LondonRail = 'london-rail',
    LondonSandwich = 'london-sandwich',
    LondonLutonAirportDART = 'london-DART',
    LondonIFSCloudCableCar = 'london-dangleway',
    GuangdongIntercityRailway = 'gd-intercity-rwy',
    ChongqingRTLoop = 'chongqingrt-loop',
    ChongqingRTLineBadge = 'chongqingrt-line-badge',
    ChengduRTOutsideFareGates = 'chengdurt-outside-fare-gates',
    Shinkansen = 'shinkansen',
}

export const isVisibleLineStyle = (style: LineStyleType): boolean => style !== LineStyleType.Unknown;

export interface ExternalLineStyleAttributes {
    [LineStyleType.SingleColor]?: SingleColorAttributes;
    [LineStyleType.Generic]?: GenericAttributes;
    [LineStyleType.Unknown]?: UnknownLineAttributes;
    [LineStyleType.ShmetroVirtualInt]?: ShmetroVirtualIntAttributes;
    [LineStyleType.ShanghaiSuburbanRailway]?: ShanghaiSuburbanRailwayAttributes;
    [LineStyleType.GzmtrVirtualInt]?: GzmtrVirtualIntAttributes;
    [LineStyleType.GZMTRLoop]?: GZMTRLoopAttributes;
    [LineStyleType.ChinaRailway]?: ChinaRailwayAttributes;
    [LineStyleType.BjsubwaySingleColor]?: BjsubwaySingleColorAttributes;
    [LineStyleType.BjsubwayTram]?: BjsubwayTramAttributes;
    [LineStyleType.BjsubwayDotted]?: BjsubwayDottedAttributes;
    [LineStyleType.DualColor]?: DualColorAttributes;
    [LineStyleType.River]?: RiverAttributes;
    [LineStyleType.MTRRaceDays]?: MTRRaceDaysAttributes;
    [LineStyleType.MTRLightRail]?: MTRLightRailAttributes;
    [LineStyleType.MTRUnpaidArea]?: MTRUnpaidAreaAttributes;
    [LineStyleType.MTRPaidArea]?: MTRPaidAreaAttributes;
    [LineStyleType.MRTUnderConstruction]?: MRTUnderConstructionAttributes;
    [LineStyleType.MRTSentosaExpress]?: MRTSentosaExpressAttributes;
    [LineStyleType.MRTTapeOut]?: MRTTapeOutAttributes;
    [LineStyleType.JREastSingleColor]?: JREastSingleColorAttributes;
    [LineStyleType.JREastSingleColorPattern]?: JREastSingleColorPatternAttributes;
    [LineStyleType.LRTSingleColor]?: LRTSingleColorAttributes;
    [LineStyleType.LondonTubeTerminal]?: LondonTubeTerminalAttributes;
    [LineStyleType.LondonTubeInternalInt]?: LondonTubeInternalIntAttributes;
    [LineStyleType.LondonTube10MinWalk]?: LondonTube10MinWalkAttributes;
    [LineStyleType.LondonRail]?: LondonRailAttributes;
    [LineStyleType.LondonSandwich]?: LondonSandwichAttributes;
    [LineStyleType.LondonLutonAirportDART]?: LondonLutonAirportDARTAttributes;
    [LineStyleType.LondonIFSCloudCableCar]?: LondonIFSCloudCableCarAttributes;
    [LineStyleType.GuangdongIntercityRailway]?: GuangdongIntercityRailwayAttributes;
    [LineStyleType.ChongqingRTLoop]?: ChongqingRTLoopAttributes;
    [LineStyleType.ChongqingRTLineBadge]?: ChongqingRTLineBadgeAttributes;
    [LineStyleType.ChengduRTOutsideFareGates]?: ChengduRTOutsideFareGatesAttributes;
    [LineStyleType.Shinkansen]?: ShinkansenAttributes;
}

export const LINE_WIDTH = 5;

export interface LineWrapperComponentProps {
    id: LineId;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    /**
     * Indicate whether or not this line is created in progress.
     * If yes, we need to set pointer-events to none
     * so elementsFromPoint will return the underlying station instead of this line.
     * https://stackoverflow.com/a/49174322
     */
    newLine: boolean;
    onPointerDown: (edge: LineId, e: React.PointerEvent<SVGElement>) => void;
    type: LinePathType;
    attrs: ExternalLinePathAttributes[keyof ExternalLinePathAttributes];
    styleType: LineStyleType;
    styleAttrs: ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes];
}

export interface LineStyleComponentProps<
    T extends NonNullable<ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]>,
> {
    id: LineId;
    /**
     * Sometimes you might need to know the path type and call different generating algorithms.
     */
    type: LinePathType;
    /**
     * The path-owned geometry to paint. Styles must inspect its kind before applying algorithms that require an open
     * centerline; filled path types can provide their outline directly as a closed area.
     */
    path: Path;
    styleAttrs: T;
    /**
     * ONLY NEEDED IN SINGLE-COLOR AS USERS WILL ONLY DRAW LINES IN THIS STYLE.
     * Indicate whether or not this line is created in progress.
     * If true, we need to set pointer-events to none
     * so elementsFromPoint will return the underlying station instead of this line.
     * https://stackoverflow.com/a/49174322
     */
    newLine: boolean;
    handlePointerDown: (edge: LineId, e: React.PointerEvent<SVGElement>) => void;
}

/**
 * The base interface of both line path and line style.
 */
interface LineBase<T extends LinePathAttributes> {
    /**
     * Default attributes for this component.
     */
    defaultAttrs: T;
    /**
     * Indicate whether or not this line path/style is a pro-only feature.
     * Default to false.
     */
    isPro?: boolean;
}

export interface LinePathAttrsProps<T extends LinePathAttributes> extends AttrsProps<T> {
    /**
     * Synchronize a node-relative endpoint offset to directly linked paths with the same path and line style.
     *
     * Paths that expose endpoint offsets should call this immediately before `handleAttrsUpdate`, so the selected path
     * and its peers are persisted by the same save/refresh operation.
     */
    syncSameStyleEndpointOffset?: (id: string, endpoint: 'source' | 'target', offset: PathPoint) => void;
    /**
     * Index for the line position in a parallel group. Leave it -1 for deactivation of parallel.
     */
    parallelIndex: number;
    /**
     * Changing the `startFrom` attr should result in new parallel recalculation.
     *
     * ONLY LINE PATHS THAT EXPOSE `startFrom` NEED TO CALL THIS HELPER.
     *
     * Note: Call this function before updating the `startFrom` attr as parallelIndex
     * is calculated based on it and changing it before calculation will result in
     * considering this line (e.g. from -> to) as an existing line (e.g. to).
     * ```ts
     * onChange: val => {
     *   recalculateParallelIndex(id, val as 'from' | 'to');
     *   attrs.startFrom = val as 'from' | 'to';
     *   handleAttrsUpdate(id, attrs);
     * },
     * ```
     */
    recalculateParallelIndex: (id: string, startFrom: 'from' | 'to') => void;
}

export interface LinePathAttributes {}

/** Viewport context supplied to a path-owned editor overlay. */
export interface LinePathOverlayProps {
    /** The single selected edge whose path-specific geometry is being edited. */
    id: LineId;
    /** Used to keep handles visually usable instead of shrinking or growing with the canvas. */
    svgViewBoxZoom: number;
    /** Used to convert pointer positions from the screen into the edge's SVG coordinate system. */
    svgViewBoxMin: PathPoint;
}

/** Mutable, gesture-scoped state owned by a path with a custom drawing lifecycle. */
export interface LinePathDrawingSession<T extends LinePathAttributes> {
    /** Receives each pointer move forwarded by the canvas in absolute SVG coordinates. */
    pointerMove: (pointer: PathPoint) => void;
    /**
     * Builds the persisted attributes after release over a connectable target.
     * Returning `undefined` cancels creation, for example when the sampled path is too short to be meaningful.
     */
    createAttrs: (target: PathPoint, pointer: PathPoint) => T | undefined;
    /** Produces transient feedback from the latest absolute SVG pointer without mutating the graph. */
    getPreview: (pointer: PathPoint) => React.JSX.Element | null;
}

/**
 * Lets a path retain gesture-specific pointer data without putting transient drawing state into React or the graph.
 * The canvas creates one session on pointer down and discards it on pointer up, so implementations may mutate their
 * private session data but must not treat it as persisted state.
 */
export interface LinePathDrawingBehavior<T extends LinePathAttributes> {
    /** Starts a drawing session with the source and initial pointer in absolute SVG coordinates. */
    createSession: (source: PathPoint, pointer: PathPoint) => LinePathDrawingSession<T>;
}

/** Initialize path-owned attributes immediately before a newly constructed edge is added to the graph. */
export type LinePathNewEdgeAttrsInitializer<T extends LinePathAttributes> = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    source: NodeId,
    target: NodeId,
    edgeAttrs: EdgeAttributes
) => T;

/**
 * The type a line path should export.
 */
export interface LinePath<T extends LinePathAttributes> extends LineBase<T> {
    /**
     * The line path component.
     */
    generatePath: PathGenerator<T>;
    /**
     * The icon displayed in the tools panel.
     */
    icon: React.JSX.Element;
    /**
     * A React component that allows user to change the attributes.
     * Will be displayed in the details panel.
     */
    attrsComponent: React.FC<LinePathAttrsProps<T>>;
    /**
     * Optional direct-manipulation UI for path geometry that cannot be edited conveniently in the details panel,
     * such as control points or width handles.
     *
     * The canvas mounts it only when exactly one edge of this path type is selected and renders it after the normal
     * line layer. An overlay should therefore render transient controls rather than another source-of-truth line,
     * stop pointer events that must not reach canvas selection, and explicitly save/refresh any graph mutations.
     */
    overlayComponent?: React.FC<LinePathOverlayProps>;
    /**
     * Optional drawing lifecycle for paths whose attributes depend on the full pointer trajectory rather than only
     * the source and target nodes.
     *
     * The session receives absolute SVG coordinates, owns high-frequency transient samples, supplies its own preview,
     * and creates the final path attributes only after release on a valid target. When omitted, the canvas previews
     * the path with `generatePath` and persists a clone of `defaultAttrs`, which is appropriate for endpoint-derived
     * paths. Implementations may return `undefined` from `createAttrs` to reject an invalid gesture.
     */
    drawingBehavior?: LinePathDrawingBehavior<T>;
    /**
     * Optional initializer for path-owned attributes of a newly constructed edge.
     *
     * It runs before the edge is added, so it can inspect existing adjacent edges without matching the candidate
     * itself. Call it immediately before every semantic edge creation, and add split edges sequentially so later
     * pieces can observe earlier ones. Loading and copying existing data should not invoke it.
     */
    initializeNewEdgeAttrs?: LinePathNewEdgeAttrsInitializer<T>;
    /**
     * Metadata for this line path.
     */
    metadata: {
        /**
         * The name displayed in the tools and details panels. In react-i18next index format.
         */
        displayName: string;
        /**
         * Whether this path geometry can participate in a reconciled line.
         *
         * A line is eligible only when both its path and style support reconcile.
         */
        supportsReconcile: boolean;
    };
}

export interface LineStyleAttrsProps<T extends LineStyleAttributes> extends AttrsProps<T> {
    reconcileId: string;
}
export interface LineStyleAttributes {}
/**
 * The type a line style should export.
 */
export interface LineStyle<T extends LineStyleAttributes> extends LineBase<T> {
    /**
     * The line style component.
     */
    component: React.FC<LineStyleComponentProps<T>>;
    /**
     * This pre component will always be under the main component and other
     * elements with the same zIndex.
     * This is not mandatory but helpful if some of the elements need to be
     * put before other stations/misc-nodes/lines.
     * Note it will be above other elements that have a smaller zIndex.
     */
    preComponent?: React.FC<LineStyleComponentProps<T>>;
    /**
     * This post component will always be above the main component and other
     * elements with the same zIndex.
     * This is not mandatory but helpful if some of the elements need to be
     * put after other stations/misc-nodes/lines.
     * Note it will be under other elements that have a bigger zIndex.
     */
    postComponent?: React.FC<LineStyleComponentProps<T>>;
    /**
     * A React component that allows user to change the attributes.
     * Will be displayed in the details panel.
     */
    attrsComponent: React.FC<LineStyleAttrsProps<T>>;
    /**
     * An optional path generator for this style to calculate offset/parallel/split paths.
     */
    pathGenerator?: StylePathGenerator<T>;
    /**
     * Optional custom equality check for "select all same style" feature.
     * When not provided, the default compares all Theme-typed properties
     * by their hex color value (index [2] of the Theme tuple).
     */
    isSameStyle?: (a: T, b: T) => boolean;
    /**
     * Metadata for this line style.
     */
    metadata: {
        /**
         * The name displayed in the details panel. In react-i18next index format.
         */
        displayName: string;
        /**
         * Indicate which LinePathType will this style support.
         */
        supportLinePathType: LinePathType[];
        /**
         * Indicate whether this style supports the reconcile feature.
         */
        supportsReconcile: boolean;
    };
}

/**
 * The generator type of a line path.
 */
export type PathGenerator<T> = (x1: number, x2: number, y1: number, y2: number, attrs?: T) => Path;

/**
 * The generator type of a line style.
 * This is used when a line style needs to generate complex paths based on the original path.
 * It takes the original path and return a record of paths with different keys.
 */
export type StylePathGenerator<T> = (path: Path, type: LinePathType, attrs: T) => Record<string, Path>;
