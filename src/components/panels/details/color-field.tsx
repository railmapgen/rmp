import React from 'react';
import { NodeType, Theme } from '../../../constants/constants';
import { LineStyleType } from '../../../constants/lines';
import { MiscNodeType } from '../../../constants/nodes';
import { StationType } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from '../../../redux/runtime/runtime-slice';
import { usePaletteTheme } from '../../../util/hooks';
import ThemeButton from '../theme-button';

/**
 * An Attributes that have a color field.
 * Extend this interface in your component's attributes if you want to use ColorField.
 *
 * NOTE: Attribute with `color` key will be populated with user defined theme from
 * the _runtime_ redux store. See `handleBackgroundDown` in `SvgWrapper` for more info.
 */
export interface AttributesWithColor {
    color: Theme;
}

type GetNodeOrEdgeAttribute = (id: string, type: NodeType | LineStyleType) => Record<string, any>;

/**
 * This component provides an easy way to have a color input in the details panel.
 * It will read the first id in `selected` and change the `colorKey` field in the related attrs.
 *
 * Make sure your component has a colorKey field in the attributes.
 * You may extend AttributesWithColor interface so you do not need to pass the colorKey parameter.
 */
export const ColorField = (props: { type: NodeType | LineStyleType; colorKey?: string; defaultTheme: Theme }) => {
    const { type, colorKey = 'color', defaultTheme } = props;
    const dispatch = useRootDispatch();
    const {
        selected,
        paletteAppClip: { input, output },
    } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;

    const hardRefresh = React.useCallback(() => {
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, refreshNodesThunk, refreshEdgesThunk, saveGraph]);
    const graph = React.useRef(window.graph);

    const [hasNodeOrEdge, getNodeOrEdgeAttribute, mergeNodeOrEdgeAttributes] = ([] as NodeType[])
        .concat(Object.values(StationType))
        .concat(Object.values(MiscNodeType))
        .find(nodeType => type === nodeType)
        ? [
              graph.current.hasNode,
              graph.current.getNodeAttribute as GetNodeOrEdgeAttribute,
              graph.current.mergeNodeAttributes,
          ]
        : [
              graph.current.hasEdge,
              graph.current.getEdgeAttribute as GetNodeOrEdgeAttribute,
              graph.current.mergeEdgeAttributes,
          ];

    const handleChangeColor = (color: Theme) => {
        // TODO: fix bind this
        if (selectedFirst && hasNodeOrEdge.bind(graph.current)(selectedFirst)) {
            const attrs = getNodeOrEdgeAttribute.bind(graph.current)(selectedFirst, type);
            attrs[colorKey] = color;
            mergeNodeOrEdgeAttributes.bind(graph.current)(selectedFirst, { [type]: attrs });
            hardRefresh();
        }
    };

    const isCurrentSelectedValid =
        selectedFirst &&
        hasNodeOrEdge.bind(graph.current)(selectedFirst) &&
        (selectedFirst.startsWith('stn') || selectedFirst.startsWith('misc_node')
            ? graph.current.getNodeAttribute(selectedFirst, 'type') === type
            : graph.current.getEdgeAttribute(selectedFirst, 'style') === type);
    const safeTheme = isCurrentSelectedValid
        ? ((getNodeOrEdgeAttribute.bind(graph.current)(selectedFirst, type) ?? {
              [colorKey]: defaultTheme,
          })[colorKey] as Theme)
        : defaultTheme;

    const { theme, requestThemeChange } = usePaletteTheme({
        theme: safeTheme,
        onThemeApplied: handleChangeColor,
    });

    return (
        <>
            <ThemeButton theme={theme} onClick={requestThemeChange} />
        </>
    );
};
