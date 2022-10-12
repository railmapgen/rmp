import React from 'react';
import { Theme } from '../../constants/constants';
import { StationAttributes, StationType } from '../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph } from '../../redux/app/app-slice';
import { setRefresh } from '../../redux/runtime/runtime-slice';
import ThemeButton from '../panel/theme-button';
import ColourModal from '../panel/colour-modal/colour-modal';

/**
 * A StationAttributes that have a color field.
 * Extend this interface if you want to use <ColorField>.
 */
export interface StationAttributesWithColor extends StationAttributes {
    color: Theme;
}

/**
 * This component provides an easy way to have a color input in the details panel.
 * It will read the first id in `selected` and change the `color` field in the related attrs.
 *
 * Make sure your station has a color field in the extended StationAttributes. (a.k.a extends StationAttributesWithColor)
 * Fail to do this will result in a redundant color field in your StationAttributes.
 */
export const ColorField = (props: { stationType: StationType; defaultAttrs: StationAttributesWithColor }) => {
    const { stationType, defaultAttrs } = props;

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
            const attrs =
                (graph.current.getNodeAttribute(selectedFirst, stationType) as StationAttributesWithColor) ??
                defaultAttrs;
            attrs.color = color;
            graph.current.mergeNodeAttributes(selectedFirst, { [stationType]: attrs });
            hardRefresh();
        }
    };

    const theme =
        selectedFirst &&
        graph.current.hasNode(selectedFirst) &&
        graph.current.getNodeAttribute(selectedFirst, 'type') === stationType
            ? (
                  (graph.current.getNodeAttribute(selectedFirst, stationType) as StationAttributesWithColor) ??
                  defaultAttrs
              ).color
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
