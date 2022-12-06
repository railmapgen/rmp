import { RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { CanvasType, LineId, EdgeAttributes, CategoriesType } from './constants';
import { DiagonalLineAttributes } from '../components/svgs/lines/diagonal-line';
import { PerpendicularLineAttributes } from '../components/svgs/lines/perpendicular-line';
import { SimpleLineAttributes } from '../components/svgs/lines/simple-line';

export enum LineType {
    Diagonal = 'diagonal',
    Perpendicular = 'perpendicular',
    Simple = 'simple',
}

export interface ExternalLineAttributes {
    [LineType.Diagonal]?: DiagonalLineAttributes;
    [LineType.Perpendicular]?: PerpendicularLineAttributes;
    [LineType.Simple]?: SimpleLineAttributes;
}

/* ----- Below are core types for all lines, DO NOT TOUCH. ----- */

export interface LineAttributes {}
export interface LineComponentProps {
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
    attrs: EdgeAttributes;
}
/**
 * The default interface a customized Line should export.
 */
export interface Line<T extends LineAttributes> {
    /**
     * The core line component.
     */
    component: (props: LineComponentProps) => JSX.Element;
    /**
     * The icon displayed in the tools panel.
     */
    icon: JSX.Element;
    /**
     * Default attributes for this component.
     */
    defaultAttrs: T;
    /**
     * Changeable actions in the details panel.
     * In a slightly different RmgFieldsField format.
     */
    fields: (Omit<RmgFieldsField, 'value' | 'onChange'> & {
        value: (attrs?: T) => string;
        onChange: (val: string | number, attrs_: T | undefined) => T;
    })[];
    /**
     * TODO: split to path generation type and style type.
     * If you export the internal path generation function, RMP
     * will try to reconcile this line with other lines to form
     * a single line/path as long as the user set the same Reconcile ID.
     */
    generatePath?: GeneratePathFunction<T>;
    /**
     * Metadata for this line.
     */
    metadata: {
        /**
         * The name displayed in the tools panel. In react-i18next index format.
         */
        displayName: string;
        /**
         * Cities that can use this line implementation.
         */
        cities: CityCode[];
        /**
         * This line is suitable to which canvas.
         */
        canvas: CanvasType[];
        /**
         * The categories which this line suits for.
         */
        categories: CategoriesType[];
        /**
         * Tags of this line.
         */
        tags: string[];
    };
}

export type GeneratePathFunction<T> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: T
) => {
    type: 'straight';
    d: `${'m' | 'M'}${string}`;
};
