import React from 'react';
import { NodeType, Theme } from '../../../constants/constants';
import { LineStyleType } from '../../../constants/lines';
import { MiscNodeType } from '../../../constants/nodes';
import { StationType } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { openPaletteAppClip, setRefreshEdges, setRefreshNodes } from '../../../redux/runtime/runtime-slice';
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
        paletteAppClip: { output },
    } = useRootSelector(state => state.runtime);
    const selectedFirst = selected.at(0);

    const hardRefresh = React.useCallback(() => {
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefreshNodes, setRefreshEdges, saveGraph]);
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
        selected.forEach(id => {
            if (graph.current.hasEdge(id)) {
                const thisType = graph.current.getEdgeAttributes(id).style;
                const attrs = graph.current.getEdgeAttribute.bind(graph.current)(id, thisType);
                if (thisType !== LineStyleType.River && (attrs as AttributesWithColor)['color'] !== undefined) {
                    (attrs as AttributesWithColor)['color'] = color;
                }
                graph.current.mergeEdgeAttributes.bind(graph.current)(id, { [thisType]: attrs });
            } else if (graph.current.hasNode(id)) {
                const thisType = graph.current.getNodeAttributes(id).type;
                const attrs = graph.current.getNodeAttribute.bind(graph.current)(id, thisType);
                if ((attrs as AttributesWithColor)['color'] !== undefined)
                    (attrs as AttributesWithColor)['color'] = color;
                graph.current.mergeNodeAttributes.bind(graph.current)(id, { [thisType]: attrs });
            }
        });
        hardRefresh();
        // TODO: fix bind this
        // if (selectedFirst && hasNodeOrEdge.bind(graph.current)(selectedFirst)) {
        //     const attrs = getNodeOrEdgeAttribute.bind(graph.current)(selectedFirst, type);
        //     attrs[colorKey] = color;
        //     mergeNodeOrEdgeAttributes.bind(graph.current)(selectedFirst, { [type]: attrs });
        //     hardRefresh();
        // }
    };

    const [isThemeRequested, setIsThemeRequested] = React.useState(false);
    React.useEffect(() => {
        if (isThemeRequested && output) {
            handleChangeColor(output);
            setIsThemeRequested(false);
        }
    }, [output?.toString()]);

    const isCurrentSelectedValid =
        selectedFirst &&
        hasNodeOrEdge.bind(graph.current)(selectedFirst) &&
        (selectedFirst.startsWith('stn') || selectedFirst.startsWith('misc_node')
            ? graph.current.getNodeAttribute(selectedFirst, 'type') === type
            : graph.current.getEdgeAttribute(selectedFirst, 'style') === type);
    const theme = isCurrentSelectedValid
        ? ((getNodeOrEdgeAttribute.bind(graph.current)(selectedFirst, type) ?? {
              [colorKey]: defaultTheme,
          })[colorKey] as Theme)
        : defaultTheme;

    return (
        <>
            <ThemeButton
                theme={theme}
                onClick={() => {
                    setIsThemeRequested(true);
                    dispatch(openPaletteAppClip(theme));
                }}
            />
        </>
    );
};
