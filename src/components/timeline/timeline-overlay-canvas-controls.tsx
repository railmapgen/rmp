import { Box, Button, Text, Tooltip } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd } from 'react-icons/md';
import {
    TIMELINE_OVERLAY_REGISTRY,
    TimelineOverlayModule,
    TimelineOverlayRegion,
} from '../../constants/timeline-overlays';
import type { TimelineOverlayLayoutItem } from '../../util/video-export/video-overlay-modules';
import TimelineLockedGlass from './timeline-locked-glass';

const regions: TimelineOverlayRegion[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const prefix = 'header.timelinePage.overlayEditor';
const percentX = (value: number) => `${(value / 1280) * 100}%`;
const percentY = (value: number) => `${(value / 720) * 100}%`;

interface Props {
    modules: readonly TimelineOverlayModule[];
    layout: readonly TimelineOverlayLayoutItem[];
    editing: boolean;
    hasExportSubscription: boolean;
    selectedId?: string;
    onSelect?: (id: string) => void;
    onAdd?: (region: TimelineOverlayRegion) => void;
    onMove?: (id: string, region: TimelineOverlayRegion, index: number) => void;
    onPreviewMove?: (id: string, region: TimelineOverlayRegion, index: number) => void;
    onCancelMove?: () => void;
}

export default function TimelineOverlayCanvasControls({
    modules,
    layout,
    editing,
    hasExportSubscription,
    selectedId,
    onSelect,
    onAdd,
    onMove,
    onPreviewMove,
    onCancelMove,
}: Props) {
    const { t } = useTranslation();
    const area = React.useRef<HTMLDivElement>(null);
    const dragRef = React.useRef<
        | {
              id: string;
              pointerId: number;
              x: number;
              y: number;
              active: boolean;
              layout: readonly TimelineOverlayLayoutItem[];
          }
        | undefined
    >(undefined);
    const [drag, setDrag] = React.useState<{ id: string; x: number; y: number }>();
    const position = (event: React.PointerEvent) => {
        const rect = area.current?.getBoundingClientRect();
        return rect?.width && rect.height
            ? {
                  x: ((event.clientX - rect.left) / rect.width) * 1280,
                  y: ((event.clientY - rect.top) / rect.height) * 720,
              }
            : undefined;
    };
    const regionAt = (x: number, y: number): TimelineOverlayRegion =>
        `${y < 360 ? 'top' : 'bottom'}-${x < 640 ? 'left' : 'right'}`;
    const start = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
        if (!editing || event.button !== 0) return;
        const point = position(event);
        if (!point) return;
        event.preventDefault();
        onSelect?.(id);
        dragRef.current = { id, pointerId: event.pointerId, ...point, active: false, layout };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const dropTarget = (point: { x: number; y: number }, current: NonNullable<typeof dragRef.current>) => {
        if (point.x < 0 || point.x > 1280 || point.y < 0 || point.y > 720) return;
        const region = regionAt(point.x, point.y);
        if (region === 'top-right' && !hasExportSubscription) return;
        // Use the starting slots: live reflow must not move its own drop thresholds.
        const siblings = current.layout.filter(item => item.region === region && item.id !== current.id);
        const next = siblings.findIndex(item => point.y < item.y + item.height / 2);
        return { region, index: next < 0 ? siblings.length : next };
    };
    const move = (event: React.PointerEvent<HTMLDivElement>) => {
        const current = dragRef.current;
        const point = position(event);
        if (!current || current.pointerId !== event.pointerId || !point) return;
        if (!current.active && Math.hypot(point.x - current.x, point.y - current.y) < 8) return;
        current.active = true;
        setDrag({ id: current.id, ...point });
        const target = dropTarget(point, current);
        if (target) onPreviewMove?.(current.id, target.region, target.index);
        else onCancelMove?.();
    };
    const finish = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
        const current = dragRef.current;
        if (!current || current.pointerId !== event.pointerId) return;
        dragRef.current = undefined;
        setDrag(undefined);
        const point = position(event);
        const target = point && dropTarget(point, current);
        if (commit && current.active && target) onMove?.(current.id, target.region, target.index);
        onCancelMove?.();
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
    };
    React.useEffect(() => {
        if (!editing) {
            dragRef.current = undefined;
            setDrag(undefined);
            onCancelMove?.();
        }
    }, [editing]);

    return (
        <Box ref={area} position="absolute" inset={0} pointerEvents="none" zIndex={2} data-overlay-canvas-controls>
            {regions.map(region => {
                const right = region.endsWith('right');
                const bottom = region.startsWith('bottom');
                const items = layout.filter(item => item.region === region);
                const width = Math.max(220, ...items.map(item => item.width));
                const x = right ? 1280 - 30 - width : 30;
                const top = items.length ? Math.min(...items.map(item => item.y)) : bottom ? 660 : 30;
                const end = items.length ? Math.max(...items.map(item => item.y + item.height)) : top;
                const plusY = bottom ? Math.max(5, top - 38) : Math.min(682, end + (items.length ? 8 : 0));
                const locked = region === 'top-right' && !hasExportSubscription;
                return (
                    <React.Fragment key={region}>
                        {editing && (
                            <Tooltip label={t(locked ? `${prefix}.subscriberLocked` : `${prefix}.addModule`)}>
                                <Button
                                    position="absolute"
                                    left={percentX(x)}
                                    top={percentY(plusY)}
                                    width={percentX(width)}
                                    height={percentY(30)}
                                    minH="18px"
                                    p={0}
                                    size="xs"
                                    borderWidth="1px"
                                    borderStyle="dashed"
                                    borderColor={locked ? 'gray.400' : 'purple.400'}
                                    bg="whiteAlpha.700"
                                    color="purple.700"
                                    pointerEvents="auto"
                                    isDisabled={locked}
                                    aria-label={t(`${prefix}.addToRegion`, {
                                        region: t(`${prefix}.regions.${region}`),
                                    })}
                                    onClick={() => onAdd?.(region)}
                                    data-overlay-add-region={region}
                                >
                                    <MdAdd />
                                </Button>
                            </Tooltip>
                        )}
                        {locked && (editing || items.length > 0) && (
                            <TimelineLockedGlass
                                label={t(`${prefix}.subscriberLocked`)}
                                subscription="RMP_EXPORT"
                                justifyContent="flex-end"
                                inset="auto"
                                left={percentX(x)}
                                top={percentY(top)}
                                width={percentX(width)}
                                height={percentY(Math.max(48, end - top))}
                                borderRadius="md"
                            />
                        )}
                    </React.Fragment>
                );
            })}
            {editing &&
                [...layout]
                    .sort((a, b) => a.id.localeCompare(b.id))
                    .map(item => {
                        const module = modules.find(module => module.id === item.id);
                        if (!module) return null;
                        return (
                            <Box
                                key={item.id}
                                role="button"
                                tabIndex={0}
                                position="absolute"
                                left={percentX(item.x)}
                                top={percentY(item.y)}
                                width={percentX(item.width)}
                                height={percentY(item.height)}
                                minH="16px"
                                borderWidth="2px"
                                borderStyle={item.id === selectedId ? 'solid' : 'dashed'}
                                borderColor={item.id === selectedId ? 'purple.500' : 'purple.300'}
                                borderRadius="md"
                                pointerEvents="auto"
                                cursor="grab"
                                opacity={drag?.id === item.id ? 0.45 : 1}
                                sx={{ touchAction: 'none' }}
                                aria-label={t(TIMELINE_OVERLAY_REGISTRY[module.type].labelKey)}
                                aria-pressed={item.id === selectedId}
                                data-overlay-handle={item.id}
                                onClick={() => onSelect?.(item.id)}
                                onPointerDown={event => start(event, item.id)}
                                onPointerMove={move}
                                onPointerUp={event => finish(event, true)}
                                onPointerCancel={event => finish(event, false)}
                                onLostPointerCapture={event => finish(event, false)}
                                onKeyDown={event => {
                                    if (event.key === 'Escape') {
                                        dragRef.current = undefined;
                                        setDrag(undefined);
                                        onCancelMove?.();
                                    } else if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onSelect?.(item.id);
                                    }
                                }}
                                _hover={{ bg: 'rgba(128, 90, 213, 0.06)' }}
                            >
                                <Text
                                    as="span"
                                    position="absolute"
                                    top={0}
                                    left={0}
                                    maxW="100%"
                                    fontSize="10px"
                                    lineHeight="14px"
                                    noOfLines={1}
                                    bg="purple.600"
                                    color="white"
                                    px={1}
                                    borderRadius="sm"
                                    display={item.empty ? 'block' : 'none'}
                                >
                                    {t(TIMELINE_OVERLAY_REGISTRY[module.type].labelKey)}
                                </Text>
                            </Box>
                        );
                    })}
            {drag && (
                <Box
                    position="absolute"
                    left={percentX(drag.x)}
                    top={percentY(drag.y)}
                    transform="translate(-50%, -50%)"
                    px={2}
                    py={1}
                    borderRadius="md"
                    bg={regionAt(drag.x, drag.y) === 'top-right' && !hasExportSubscription ? 'gray.600' : 'purple.600'}
                    color="white"
                    fontSize="xs"
                    boxShadow="md"
                    zIndex={4}
                >
                    {t(`${prefix}.regions.${regionAt(drag.x, drag.y)}`)}
                </Box>
            )}
        </Box>
    );
}
