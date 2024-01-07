import { Box, Button, Heading, VStack } from '@chakra-ui/react';
import { RmgLabel, RmgSelect } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import { StationAttributes } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import {
    openPaletteAppClip,
    setRefreshEdges,
    setRefreshNodes,
    setSelected,
} from '../../../redux/runtime/runtime-slice';
import ThemeButton from '../theme-button';
import { AttributesWithColor } from './color-field';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import { changeLinePathTypeSelected, changeLineStyleTypeSelected } from '../../../util/change-types';

const defaultLinePathData = {
    default: { metadata: { displayName: '...' } },
};

const defaultLineStyleData = {
    default: { metadata: { displayName: '...' } },
};

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

    const availableLinePathOptions = {
        ...Object.fromEntries(
            Object.entries(defaultLinePathData).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ),
        ...(Object.fromEntries(
            Object.entries(linePaths).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ) as { [k in LinePathType]: string }),
    };
    const availableLineStyleOptions = {
        ...Object.fromEntries(
            Object.entries(defaultLineStyleData).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ),
        ...(Object.fromEntries(
            Object.entries(lineStyles).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ) as { [k in LineStyleType]: string }),
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
                {t('panel.details.Batch Properties')}
            </Heading>
            <RmgLabel label={t('panel.details.info.multipleLinePathType')} minW="276">
                <RmgSelect
                    options={availableLinePathOptions}
                    disabledOptions={['simple']}
                    defaultValue="default"
                    value="default"
                    onChange={({ target: { value } }) => {
                        changeLinePathTypeSelected(graph.current, selected, value as LinePathType);
                        hardRefresh();
                    }}
                />
            </RmgLabel>
            <RmgLabel label={t('panel.details.info.multipleLineStyleType')} minW="276">
                <RmgSelect
                    options={availableLineStyleOptions}
                    defaultValue="default"
                    value="default"
                    onChange={({ target: { value } }) => {
                        changeLineStyleTypeSelected(graph.current, selected, value as LineStyleType, theme);
                        hardRefresh();
                    }}
                />
            </RmgLabel>
            <RmgLabel label={t('panel.details.multipleChangeColor')}>
                <ThemeButton
                    theme={theme}
                    onClick={() => {
                        setIsThemeRequested(true);
                        dispatch(openPaletteAppClip(theme));
                    }}
                />
            </RmgLabel>
            <Heading as="h5" size="sm">
                {t('panel.details.selected')} {selected.size}
            </Heading>
            <VStack m="var(--chakra-space-1)">
                {[...selected].map(id => (
                    <Button
                        key={id}
                        width="100%"
                        size="sm"
                        variant="solid"
                        onClick={() => dispatch(setSelected(new Set([id])))}
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
