import { RmgFieldsField } from '@railmapgen/rmg-components';
import { ShmetroNumLineBadgeAttributes } from '../components/misc/shmetro-num-line-badge';
import { ShmetroTextLineBadgeAttributes } from '../components/misc/shmetro-text-line-badge';
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
    /**
     * The core node component.
     */
    component: (props: NodeComponentProps<T>) => JSX.Element;
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
     * Metadata for this node.
     */
    metadata: {
        /**
         * The name displayed in the tools panel. In react-i18next index format.
         */
        displayName: string;
    };
}

export enum MiscNodeType {
    Virtual = 'virtual',
    ShmetroNumLineBadge = 'shmetro-num-line-badge',
    ShmetroTextLineBadge = 'shmetro-text-line-badge',
}
export interface MiscNodeAttributes {
    [MiscNodeType.Virtual]?: VirtualAttributes;
    [MiscNodeType.ShmetroNumLineBadge]?: ShmetroNumLineBadgeAttributes;
    [MiscNodeType.ShmetroTextLineBadge]?: ShmetroTextLineBadgeAttributes;
}
