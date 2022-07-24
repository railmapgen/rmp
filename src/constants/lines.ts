import { RmgFieldsField } from '@railmapgen/rmg-components';
import { LineId, EdgeAttributes } from './constants';
import { DiagonalLineAttributes } from '../components/line/diagonal-line';
import { PerpendicularLineAttributes } from '../components/line/perpendicular-line';

export enum LineType {
    Diagonal = 'diagonal',
    Perpendicular = 'perpendicular',
}

export interface ExternalLineAttributes {
    [LineType.Diagonal]?: DiagonalLineAttributes;
    [LineType.Perpendicular]?: PerpendicularLineAttributes;
}

export interface LineAttributes {}
export interface LineComponentProps {
    id: LineId;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    handleClick: (edge: LineId, e: React.MouseEvent<SVGPathElement, MouseEvent>) => void;
    attrs: EdgeAttributes;
}
export interface Line<T extends LineAttributes> {
    component: (props: LineComponentProps) => JSX.Element;
    icon: JSX.Element;
    defaultAttrs: T;
    fields: (Omit<RmgFieldsField, 'value' | 'onChange'> & {
        value: (attrs?: T) => string;
        onChange: (val: string | number, attrs_: T | undefined) => T;
    })[];
}
