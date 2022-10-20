import { RmgFieldsField } from '@railmapgen/rmg-components';
import { MiscEdgeId } from './constants';
import { GeneratePathFunction } from './lines';
import { ShmetroVirtualIntAttributes } from '../components/edges/shmetro-virtual-int';
import { GzmtrVirtualIntAttributes } from '../components/edges/gzmtr-virtual-int';

export interface EdgeComponentProps<T> {
    id: MiscEdgeId;
    attrs: T;
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
    handleClick: (edge: MiscEdgeId, e: React.MouseEvent<SVGPathElement, MouseEvent>) => void;
}
export interface Edge<T> {
    /**
     * The core edge component.
     */
    component: (props: EdgeComponentProps<T>) => JSX.Element;
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
     * Metadata for this node.
     */
    metadata: {
        /**
         * The name displayed in the tools panel. In react-i18next index format.
         */
        displayName: string;
        /**
         * Tags of this station.
         */
        tags: string[];
    };
}

export enum MiscEdgeType {
    ShmetroVirtualInt = 'shmetro-virtual-int',
    GzmtrVirtualInt = 'gzmtr-virtual-int',
}
export interface MiscEdgeAttributes {
    [MiscEdgeType.ShmetroVirtualInt]?: ShmetroVirtualIntAttributes;
    [MiscEdgeType.GzmtrVirtualInt]?: GzmtrVirtualIntAttributes;
}
