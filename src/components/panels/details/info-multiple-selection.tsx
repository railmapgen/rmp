import { Box, Button, Heading, VStack } from '@chakra-ui/react';
import React from 'react';
import { Theme } from '../../../constants/constants';
import { LineStyleType } from '../../../constants/lines';
import { StationAttributes } from '../../../constants/stations';
import { useTranslation } from 'react-i18next';
import { saveGraph } from '../../../redux/param/param-slice';
import { useRootDispatch, useRootSelector } from '../../../redux';
import {
    openPaletteAppClip,
    setRefreshEdges,
    setRefreshNodes,
    setSelected,
} from '../../../redux/runtime/runtime-slice';
import { AttributesWithColor } from './color-field';
import { RmgFields } from '@railmapgen/rmg-components';
import ThemeButton from '../theme-button';

export default function InfoMultipleSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const {
        selected,
        theme,
        paletteAppClip: { output },
    } = useRootSelector(state => state.runtime);

    const hardRefresh = React.useCallback(() => {
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefreshNodes, setRefreshEdges, saveGraph]);
    const graph = React.useRef(window.graph);

    const handleChange = (id: string) => {
        dispatch(setSelected([id]));
    };

    const getName = (id: string) => {
        if (id.startsWith('stn') || id.startsWith('misc_node')) {
            const attr = graph.current.getNodeAttributes(id);
            const type = attr.type;
            return id.startsWith('stn') ? (attr[type] as StationAttributes).names.join('/') : type;
        } else if (id.startsWith('line')) {
            const [s, t] = graph.current.extremities(id);
            const source = graph.current.getSourceAttributes(id);
            const target = graph.current.getTargetAttributes(id);
            const sT = source.type;
            const tT = target.type;
            return (
                (s.startsWith('stn') ? (source[sT] as StationAttributes).names[0] : sT) +
                ' - ' +
                (t.startsWith('stn') ? (target[tT] as StationAttributes).names[0] : tT)
            );
        }
    };

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
    };

    const [isThemeRequested, setIsThemeRequested] = React.useState(false);
    React.useEffect(() => {
        if (isThemeRequested && output) {
            handleChangeColor(output);
            setIsThemeRequested(false);
        }
    }, [output?.toString()]);

    return (
        <Box>
            <Heading as="h5" size="sm">
                {t('panel.details.selected')} {selected.length}
            </Heading>
            <RmgFields
                fields={[
                    {
                        type: 'custom',
                        label: t("Change selected objects' color to:"),
                        component: (
                            <ThemeButton
                                theme={theme}
                                onClick={() => {
                                    setIsThemeRequested(true);
                                    dispatch(openPaletteAppClip(theme));
                                }}
                            />
                        ),
                        minW: 'full',
                    },
                ]}
            />
            <VStack m="var(--chakra-space-1)">
                {selected.map(id => {
                    return (
                        <Button
                            key={id}
                            width="100%"
                            size="sm"
                            variant="solid"
                            onClick={() => handleChange(id)}
                            overflow="hidden"
                            maxW="270"
                            textOverflow="ellipsis"
                            whiteSpace="nowrap"
                            display="ruby"
                        >
                            {getName(id)?.replaceAll('\\', '⏎')}
                        </Button>
                    );
                })}
            </VStack>
        </Box>
    );
}
