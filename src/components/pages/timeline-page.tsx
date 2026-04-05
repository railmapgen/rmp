import { Box, Divider, Flex, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import { Id } from '../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setTimelineDocument } from '../../redux/timeline/timeline-slice';
import { normalizeTimelineDocument } from '../../util/timeline';
import TimelineTrackPanel from '../timeline/timeline-track-panel';
import TimelineSvgWrapper, { TimelineSvgHandle } from '../timeline/timeline-svg-wrapper';

const TRACK_PANEL_HEIGHT = 260;

export default function TimelinePage() {
    const dispatch = useRootDispatch();
    const timeline = useRootSelector(state => state.timeline.present);
    const {
        refresh: { nodes: refreshNodes, edges: refreshEdges },
    } = useRootSelector(state => state.runtime);
    const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
    const svgHandleRef = React.useRef<TimelineSvgHandle>(null);
    const graph = React.useRef(window.graph);
    const [selectedId, setSelectedId] = React.useState<Id | undefined>(undefined);

    const handleTimelineChange = React.useCallback(
        (nextDocument: typeof timeline) => {
            dispatch(setTimelineDocument(normalizeTimelineDocument(nextDocument)));
        },
        [dispatch]
    );

    const handleSelectEntry = React.useCallback((refId: Id) => {
        setSelectedId(refId);
        svgHandleRef.current?.focusElement(refId);
    }, []);

    React.useEffect(() => {
        if (!selectedId) return;
        if (graph.current.hasNode(selectedId) || graph.current.hasEdge(selectedId)) return;
        setSelectedId(undefined);
    }, [refreshEdges, refreshNodes, selectedId]);

    return (
        <Flex direction="column" height="100%" overflow="hidden">
            <Box flex="1" minH="0">
                <TimelineSvgWrapper ref={svgHandleRef} selectedId={selectedId} onSelect={setSelectedId} />
            </Box>
            <Divider borderColor={borderColor} />
            <Box height={`${TRACK_PANEL_HEIGHT}px`} minH={`${TRACK_PANEL_HEIGHT}px`} maxH={`${TRACK_PANEL_HEIGHT}px`}>
                <TimelineTrackPanel
                    document={timeline}
                    selectedId={selectedId}
                    onSelectEntry={handleSelectEntry}
                    onDocumentChange={handleTimelineChange}
                />
            </Box>
        </Flex>
    );
}
