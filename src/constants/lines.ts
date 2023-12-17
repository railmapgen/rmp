import React from 'react';
import { AttrsProps, LineId } from './constants';
import { SimplePathAttributes } from '../components/svgs/lines/paths/simple';
import { DiagonalPathAttributes } from '../components/svgs/lines/paths/diagonal';
import { PerpendicularPathAttributes } from '../components/svgs/lines/paths/perpendicular';
import { RotatePerpendicularPathAttributes } from '../components/svgs/lines/paths/rotate-perpendicular';
import { SingleColorAttributes } from '../components/svgs/lines/styles/single-color';
import { ShmetroVirtualIntAttributes } from '../components/svgs/lines/styles/shmetro-virtual-int';
import { GzmtrVirtualIntAttributes } from '../components/svgs/lines/styles/gzmtr-virtual-int';
import { ChinaRailwayAttributes } from '../components/svgs/lines/styles/china-railway';
import { BjsubwaySingleColorAttributes } from '../components/svgs/lines/styles/bjsubway-single-color';
import { BjsubwayTramAttributes } from '../components/svgs/lines/styles/bjsubway-tram';
import { BjsubwayDottedAttributes } from '../components/svgs/lines/styles/bjsubway-dotted';
import { DualColorAttributes } from '../components/svgs/lines/styles/dual-color';
import { RiverAttributes } from '../components/svgs/lines/styles/river';
import { MTRRaceDaysAttributes } from '../components/svgs/lines/styles/mtr-race-day';
import { MTRLightRailAttributes } from '../components/svgs/lines/styles/mtr-light-rail';
import { MTRUnpaidAreaAttributes } from '../components/svgs/lines/styles/mtr-unpaid-area';
import { MTRPaidAreaAttributes } from '../components/svgs/lines/styles/mtr-paid-area';
import { MRTUnderConstructionAttributes } from '../components/svgs/lines/styles/mrt-under-construction';
import { MRTSentosaExpressAttributes } from '../components/svgs/lines/styles/mrt-sentosa-express';

export enum LinePathType {
    Diagonal = 'diagonal',
    Perpendicular = 'perpendicular',
    RotatePerpendicular = 'ro-perp',
    Simple = 'simple',
}

export interface ExternalLinePathAttributes {
    [LinePathType.Simple]?: SimplePathAttributes;
    [LinePathType.Diagonal]?: DiagonalPathAttributes;
    [LinePathType.Perpendicular]?: PerpendicularPathAttributes;
    [LinePathType.RotatePerpendicular]?: RotatePerpendicularPathAttributes;
}

export enum LineStyleType {
    SingleColor = 'single-color',
    ShmetroVirtualInt = 'shmetro-virtual-int',
    GzmtrVirtualInt = 'gzmtr-virtual-int',
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
}

export interface ExternalLineStyleAttributes {
    [LineStyleType.SingleColor]?: SingleColorAttributes;
    [LineStyleType.ShmetroVirtualInt]?: ShmetroVirtualIntAttributes;
    [LineStyleType.GzmtrVirtualInt]?: GzmtrVirtualIntAttributes;
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
}

export const LineStylesWithColor = [
    LineStyleType.SingleColor,
    LineStyleType.BjsubwaySingleColor,
    LineStyleType.BjsubwayTram,
    LineStyleType.BjsubwayDotted,
    LineStyleType.MTRRaceDays,
    LineStyleType.MTRLightRail,
    LineStyleType.MRTUnderConstruction,
];

/* ----- Below are core types for all lines, DO NOT TOUCH. ----- */

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
    handleClick: (edge: LineId, e: React.MouseEvent<SVGPathElement, MouseEvent>) => void;
    type: LinePathType;
    attrs: ExternalLinePathAttributes[keyof ExternalLinePathAttributes];
    styleType: LineStyleType;
    styleAttrs: ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes];
}

export interface LineStyleComponentProps<
    T extends NonNullable<ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]>
> {
    id: LineId;
    /**
     * Sometimes you might need to know the path type and call different generating algorithms.
     */
    type: LinePathType;
    path: `${'m' | 'M'}${string}`;
    styleAttrs: T;
    /**
     * ONLY NEEDED IN SINGLE-COLOR AS USERS WILL ONLY DRAW LINES IN THIS STYLE.
     * Indicate whether or not this line is created in progress.
     * If true, we need to set pointer-events to none
     * so elementsFromPoint will return the underlying station instead of this line.
     * https://stackoverflow.com/a/49174322
     */
    newLine: boolean;
    handleClick: (edge: LineId, e: React.MouseEvent<SVGPathElement, MouseEvent>) => void;
}

/**
 * The base interface of both line path and line style.
 */
interface LineBase<T extends LinePathAttributes> {
    /**
     * The icon displayed in the tools panel.
     */
    icon: JSX.Element;
    /**
     * Default attributes for this component.
     */
    defaultAttrs: T;
    /**
     * A React component that allows user to change the attributes.
     * Will be displayed in the details panel.
     */
    attrsComponent: React.FC<AttrsProps<T>>;
}

export interface LinePathAttributes {}
/**
 * The type a line path should export.
 */
export interface LinePath<T extends LinePathAttributes> extends LineBase<T> {
    /**
     * The line path component.
     */
    generatePath: GeneratePathFunction<T>;
    /**
     * Metadata for this line path.
     */
    metadata: {
        /**
         * The name displayed in the tools and details panels. In react-i18next index format.
         */
        displayName: string;
    };
}

export interface LineStyleAttributes {}
/**
 * The type a line style should export.
 */
export interface LineStyle<T extends LineStyleAttributes> extends Omit<LineBase<T>, 'icon'> {
    /**
     * The line style component.
     */
    component: React.FC<LineStyleComponentProps<T>>;
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
    };
}

/**
 * The generator type of a line path.
 */
export type GeneratePathFunction<T> = (x1: number, x2: number, y1: number, y2: number, attrs?: T) => `M ${string}`;
