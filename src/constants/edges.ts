import { RmgFieldsField } from '@railmapgen/rmg-components';
import { MiscEdgeId } from './constants';

export enum MiscEdgeType {}

export interface MiscEdgeAttributes {}

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
     * In a slightly different RmgFieldsField format that hides some internal implementation.
     * Attrs should be obtained via this wrapper instead of window.graph or redux.
     */
    fields: (Omit<RmgFieldsField, 'value' | 'onChange'> & {
        value: (attrs?: T) => string;
        disabledOptions: (attrs?: T) => (string | number)[];
        onChange: (val: string | number, attrs_?: T) => T;
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
