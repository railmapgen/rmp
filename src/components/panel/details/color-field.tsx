import React from 'react';
import { NodeType, Theme } from '../../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/app/app-slice';
import { setRefresh } from '../../../redux/runtime/runtime-slice';
import ThemeButton from '../theme-button';
import ColourModal from '../colour-modal/colour-modal';

/**
 * An Attributes that have a color field.
 * Extend this interface in your component's attributes if you want to use <ColorField />.
 */
export interface AttributesWithColor {
    color: Theme;
}

/**
 * This component provides an easy way to have a color input in the details panel.
 * It will read the first id in `selected` and change the `color` field in the related attrs.
 *
 * Make sure your component has a color field in the attributes.
 * You may extend AttributesWithColor interface.
 * Fail to do this will result in a redundant color field in your component's attributes.
 */
export const ColorField = (props: { type: NodeType; defaultAttrs: AttributesWithColor }) => {
    const { type, defaultAttrs } = props;

    const dispatch = useRootDispatch();

    const hardRefresh = React.useCallback(() => {
        dispatch(setRefresh());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefresh, saveGraph]);
    const { selected } = useRootSelector(state => state.runtime);
    const selectedFirst = selected.at(0);
    const graph = React.useRef(window.graph);

    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const handleChangeColor = (color: Theme) => {
        if (selectedFirst && graph.current.hasNode(selectedFirst)) {
            const attrs = (graph.current.getNodeAttribute(selectedFirst, type) as AttributesWithColor) ?? defaultAttrs;
            attrs.color = color;
            graph.current.mergeNodeAttributes(selectedFirst, { [type]: attrs });
            hardRefresh();
        }
    };

    const theme =
        selectedFirst &&
        graph.current.hasNode(selectedFirst) &&
        graph.current.getNodeAttribute(selectedFirst, 'type') === type
            ? ((graph.current.getNodeAttribute(selectedFirst, type) as AttributesWithColor) ?? defaultAttrs).color
            : defaultAttrs.color;

    return (
        <>
            <ThemeButton theme={theme} onClick={() => setIsModalOpen(true)} />
            <ColourModal
                isOpen={isModalOpen}
                defaultTheme={theme}
                onClose={() => setIsModalOpen(false)}
                onUpdate={nextTheme => handleChangeColor(nextTheme)}
            />
        </>
    );
};
