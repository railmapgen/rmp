import { Box, Flex } from '@chakra-ui/react';
import React from 'react';
import { Id } from '../../constants/constants';
import { MapStyle } from '../../map/map-style';
import { TimelineGraph } from '../../timeline/timeline-project-context';
import { fitVideoPreviewFrame } from './timeline-preview-layout';
import TimelineSvgWrapper from './timeline-svg-wrapper';

const ignoreChange = () => {};
const initialViewport = { x: 0, y: 0, zoom: 100 };

/** Reuse the editor's SVG resources, with a stable full-map camera and no editing affordances. */
export default function TimelineFixedResourcesPreview({
    graph,
    selectedIds,
    mapEnabled,
    mapStyle,
    isSubscriber,
}: {
    graph: TimelineGraph;
    selectedIds: Set<Id>;
    mapEnabled: boolean;
    mapStyle: MapStyle;
    isSubscriber: boolean;
}) {
    const areaRef = React.useRef<HTMLDivElement>(null);
    const [size, setSize] = React.useState<ReturnType<typeof fitVideoPreviewFrame>>();
    React.useLayoutEffect(() => {
        if (!areaRef.current) return;
        const observer = new ResizeObserver(([entry]) =>
            setSize(fitVideoPreviewFrame(entry.contentRect.width, entry.contentRect.height))
        );
        observer.observe(areaRef.current);
        return () => observer.disconnect();
    }, []);
    return (
        <Flex ref={areaRef} width="100%" height="100%" align="center" justify="center" bg="gray.900" overflow="hidden">
            <Box
                width={size ? `${size.width}px` : '100%'}
                height={size ? `${size.height}px` : undefined}
                aspectRatio={16 / 9}
                bg="white"
                data-fixed-resources-preview
            >
                <TimelineSvgWrapper
                    canvasId="fixed-resource-preview"
                    graph={graph}
                    visibleIds={selectedIds}
                    onSelect={ignoreChange}
                    viewport={initialViewport}
                    onViewportChange={ignoreChange}
                    mapEnabled={mapEnabled}
                    mapStyle={mapStyle}
                    isSubscriber={isSubscriber}
                    fitToGraph
                    readOnly
                />
            </Box>
        </Flex>
    );
}
