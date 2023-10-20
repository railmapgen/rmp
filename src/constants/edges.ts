import { RmgFieldsField } from '@railmapgen/rmg-components';
import { AttrsProps, MiscEdgeId } from './constants';

/**
 * @deprecated Previous miscellaneous edge types should be upgraded to LineStyleType.
 */
export enum MiscEdgeType {}

/**
 * @deprecated Previous miscellaneous edge attributes should be upgraded to LinePathAttributes.
 */
export interface MiscEdgeAttributes {}

/**
 * @deprecated Previous miscellaneous edge props should be upgraded to LineStyleComponentProps.
 */
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

/**
 * @deprecated Previous miscellaneous edge should be upgraded to LineStyle.
 */
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
     * @deprecated Compose the attributes' editor UI as a React component and
     * set it in `attrsComponent`. Directly pass `RmgFieldsField` is not straightforward
     * and have several limitations such as i18n translation and dynamic UI changed
     * on attributes updated.
     *
     * Changeable actions in the details panel.
     * In a slightly different RmgFieldsField format that hides some internal implementation.
     * Attrs should be obtained via this wrapper instead of window.graph or redux.
     *
     * If `attrsComponent` is set, this will be ignored.
     */
    fields?: (Omit<RmgFieldsField, 'value' | 'onChange'> & {
        value: (attrs?: T) => string;
        disabledOptions: (attrs?: T) => (string | number)[];
        onChange: (val: string | number, attrs_?: T) => T;
    })[];
    /**
     * A React component that allows user to change the attributes.
     * Will be displayed in the details panel.
     *
     * Deprecated `fields` will be ignored if this is set.
     */
    attrsComponent?: React.FC<AttrsProps<T>>;
    /**
     * Metadata for this edge.
     */
    metadata: {
        /**
         * The name displayed in the tools panel. In react-i18next index format.
         */
        displayName: string;
    };
}
