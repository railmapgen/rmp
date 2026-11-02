import { Box, Button, Divider, Flex, Heading, Select, Text, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StationAttributes, StationType } from '../../constants/stations';
import { TimelineDocument, TimelineKeyframeEntry, TimelineKeyframeStation } from '../../constants/timeline';
import { TimelineGraph } from '../../timeline/timeline-project-context';
import { updateKeyframeStation } from '../../util/timeline';
import { TimelinePlaybackTiming } from '../../util/timeline-playback';
import { mergeStationAttributeChanges } from '../panels/details/station-attrs-context';
import stations from '../svgs/stations/stations';
import { getTimelineKeyframeStationAtCursor } from './timeline-keyframe-state';
import TimelineStationAttrs from './timeline-station-attrs';

interface TimelineKeyframePanelProps {
    graph: TimelineGraph;
    document: TimelineDocument;
    entry: TimelineKeyframeEntry;
    mapEnabled: boolean;
    timing?: TimelinePlaybackTiming;
    onChange: (update: (document: TimelineDocument) => TimelineDocument) => void;
    onUndo: () => void;
    onDone: () => void;
}

/** Edit a detached station snapshot through the same controls used by the map editor. */
export default function TimelineKeyframePanel({
    graph,
    document,
    entry,
    mapEnabled,
    timing,
    onChange,
    onUndo,
    onDone,
}: TimelineKeyframePanelProps) {
    const { t } = useTranslation();
    const muted = useColorModeValue('gray.600', 'gray.400');
    const station = React.useMemo(
        () => getTimelineKeyframeStationAtCursor(graph, document, entry.id, timing),
        [graph, document, entry.id, timing]
    );

    const changeStation = (next: TimelineKeyframeStation, original?: StationAttributes) =>
        onChange(current => {
            const latest = getTimelineKeyframeStationAtCursor(graph, current, entry.id, timing);
            if (!latest) return current;
            if (original && latest.type !== next.type) {
                // A delayed name edit still belongs to this marker after its component type changes.
                const names: StationAttributes['names'] = [latest.attrs.names[0], ...latest.attrs.names.slice(1)];
                names.forEach((name, index) => {
                    const edited = next.attrs.names[index];
                    if (edited !== undefined && edited !== original.names[index]) names[index] = edited;
                });
                if (JSON.stringify(names) === JSON.stringify(latest.attrs.names)) return current;
                return updateKeyframeStation(current, entry.id, {
                    type: latest.type,
                    attrs: { ...latest.attrs, names },
                });
            }
            const attrs = original ? mergeStationAttributeChanges(latest.attrs, original, next.attrs) : next.attrs;
            return updateKeyframeStation(current, entry.id, { type: next.type, attrs });
        });
    const changeType = (type: StationType) => {
        if (!station || type === station.type) return;
        const attrs = structuredClone(stations[type].defaultAttrs);
        attrs.names = [
            station.attrs.names[0] ?? attrs.names[0],
            ...attrs.names.slice(1).map((name, index) => station.attrs.names[index + 1] ?? name),
        ];
        changeStation({ type, attrs });
    };

    return (
        <Flex
            as="section"
            aria-label={t('header.timelinePage.keyframeEditor.title')}
            direction="column"
            height="100%"
            minH={0}
            pt={10}
        >
            <Flex px={4} pb={3} gap={3} align="start" justify="space-between">
                <Box minW={0}>
                    <Heading as="h2" size="sm">
                        {t('header.timelinePage.keyframeEditor.title')}
                    </Heading>
                    <Text fontSize="xs" mt={2} color={muted}>
                        {t('header.timelinePage.keyframeEditor.hint')}
                    </Text>
                </Box>
                <Button size="sm" colorScheme="purple" flexShrink={0} onClick={onDone}>
                    {t('header.timelinePage.keyframeEditor.done')}
                </Button>
            </Flex>
            <Divider />
            <Box flex={1} minH={0} overflowY="auto" p={4}>
                {station ? (
                    <>
                        <Box as="label" display="block" fontSize="sm" fontWeight="medium" mb={4}>
                            {t('panel.details.info.stationType')}
                            <Select
                                mt={2}
                                value={station.type}
                                onChange={event => changeType(event.target.value as StationType)}
                            >
                                {Object.entries(stations).map(([type, definition]) => (
                                    <option key={type} value={type}>
                                        {t(definition.metadata.displayName)}
                                    </option>
                                ))}
                            </Select>
                        </Box>
                        <TimelineStationAttrs
                            key={`${entry.id}:${station.type}`}
                            id={entry.refId}
                            type={station.type}
                            attrs={structuredClone(station.attrs)}
                            onChange={(attrs, original) => changeStation({ type: station.type, attrs }, original)}
                            onUndo={onUndo}
                            mapEnabled={mapEnabled}
                        />
                    </>
                ) : (
                    <Text fontSize="sm" color={muted}>
                        {t('header.timelinePage.keyframeEditor.stationOnly')}
                    </Text>
                )}
            </Box>
        </Flex>
    );
}
