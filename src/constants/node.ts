import { RmgFieldsField } from '@railmapgen/rmg-components';
import { VirtualAttributes } from '../components/misc/virtual';
import { MiscNodeId } from './constants';

export interface NodeComponentProps<T> {
    id: MiscNodeId;
    attrs: T;
    x: number;
    y: number;
    handlePointerDown: (node: MiscNodeId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerMove: (node: MiscNodeId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerUp: (node: MiscNodeId, e: React.PointerEvent<SVGElement>) => void;
}
export interface Node<T> {
    component: (props: NodeComponentProps<T>) => JSX.Element;
    icon: JSX.Element;
    defaultAttrs: T;
    fields: (Omit<RmgFieldsField, 'value' | 'onChange'> & {
        value: (attrs?: T) => string;
        onChange: (val: string | number, attrs_: T | undefined) => T;
    })[];
}

/**
 * Nodes other than stations must start with `misc-node`.
 */
export enum MiscNodeType {
    Virtual = 'virtual',
}
export interface MiscNodeAttributes {
    [MiscNodeType.Virtual]?: VirtualAttributes;
}
