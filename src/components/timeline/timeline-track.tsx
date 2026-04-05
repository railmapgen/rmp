import { HStack } from '@chakra-ui/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes } from '../../constants/constants';
import { TimelineDocument } from '../../constants/timeline';
import TimelineClip from './timeline-clip';

interface TimelineTrackProps {
    document: TimelineDocument;
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    selectedId?: Id;
    onSelectEntry: (refId: Id) => void;
    onRemoveEntry: (entryId: string) => void;
    onDragStart: (entryId: string) => void;
    onDragOver: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
}

export default function TimelineTrack({
    document,
    graph,
    selectedId,
    onSelectEntry,
    onRemoveEntry,
    onDragStart,
    onDragOver,
    onDragEnd,
}: TimelineTrackProps) {
    return (
        <HStack align="stretch" spacing={4} overflowX="auto" overflowY="hidden" pb={2}>
            {document.track.map((entry, index) => (
                <TimelineClip
                    key={entry.id}
                    entry={entry}
                    graph={graph}
                    isSelected={selectedId === entry.refId}
                    onSelect={() => onSelectEntry(entry.refId)}
                    onRemove={() => onRemoveEntry(entry.id)}
                    onDragStart={() => onDragStart(entry.id)}
                    onDragOver={e => onDragOver(index, e)}
                    onDragEnd={onDragEnd}
                />
            ))}
        </HStack>
    );
}
