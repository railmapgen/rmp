import { Box, Button, Heading, VStack } from '@chakra-ui/react';
import { RmgLabel } from '@railmapgen/rmg-components';
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

    const getName = (id: string) => {
        if (graph.current.hasNode(id)) {
            const attr = graph.current.getNodeAttributes(id);
            const type = attr.type;
            return id.startsWith('stn') ? (attr[type] as StationAttributes).names.join('/') : type;
        } else if (graph.current.hasEdge(id)) {
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
                const attrs = graph.current.getEdgeAttribute(id, thisType);
                if (thisType !== LineStyleType.River && (attrs as AttributesWithColor)['color'] !== undefined) {
                    (attrs as AttributesWithColor)['color'] = color;
                }
                graph.current.mergeEdgeAttributes(id, { [thisType]: attrs });
            } else if (graph.current.hasNode(id)) {
                const thisType = graph.current.getNodeAttributes(id).type;
                const attrs = graph.current.getNodeAttribute(id, thisType);
                if ((attrs as AttributesWithColor)['color'] !== undefined)
                    (attrs as AttributesWithColor)['color'] = color;
                graph.current.mergeNodeAttributes(id, { [thisType]: attrs });
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
                {t('panel.details.selected')} {selected.size}
            </Heading>
            <RmgLabel label={t('panel.details.multipleChangeColor')}>
                <ThemeButton
                    theme={theme}
                    onClick={() => {
                        setIsThemeRequested(true);
                        dispatch(openPaletteAppClip(theme));
                    }}
                />
            </RmgLabel>
            <VStack m="var(--chakra-space-1)">
                {[...selected].map(id => (
                    <Button
                        key={id}
                        width="100%"
                        size="sm"
                        variant="solid"
                        onClick={() => dispatch(setSelected(new Set(id)))}
                        overflow="hidden"
                        maxW="270"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                        display="ruby"
                    >
                        {getName(id)?.replaceAll('\\', '⏎')}
                    </Button>
                ))}
            </VStack>
        </Box>
    );
}
