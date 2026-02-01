import { Box, Divider, Portal, useOutsideClick } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import useEvent from 'react-use-event-hook';
import { Id, LineId, NodeId } from '../constants/constants';
import { MAX_MASTER_NODE_FREE } from '../constants/master';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/param/param-slice';
import { clearSelected, refreshEdgesThunk, refreshNodesThunk, setSelected } from '../redux/runtime/runtime-slice';
import {
    exportSelectedNodesAndEdges,
    importSelectedNodesAndEdges,
    exportNodeSpecificAttrs,
    exportEdgeSpecificAttrs,
    parseClipboardData,
    importNodeSpecificAttrs,
    importEdgeSpecificAttrs,
    getSelectedElementsType,
    NodeSpecificAttrsClipboardData,
    EdgeSpecificAttrsClipboardData,
} from '../util/clipboard';
import { pointerPosToSVGCoord, roundToMultiple } from '../util/helpers';
import { MAX_PARALLEL_LINES_FREE } from '../util/parallel';
import { flipSelectedNodes, rotateSelectedNodes } from '../util/transform';

interface ContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, position, onClose }) => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const { activeSubscriptions } = useRootSelector(state => state.account);
    const {
        preference: { autoParallel },
    } = useRootSelector(state => state.app);
    const { svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param);
    const {
        selected,
        count: { masters: masterNodesCount, lines: parallelLinesCount },
    } = useRootSelector(state => state.runtime);

    const isMasterDisabled = !activeSubscriptions.RMP_CLOUD && masterNodesCount + 1 > MAX_MASTER_NODE_FREE;
    const isParallelDisabled =
        !autoParallel || // Disabled if autoParallel is off
        // Or disabled only if autoParallel is on and user has no cloud subscription and exceeds free limit
        (autoParallel && !activeSubscriptions.RMP_CLOUD && parallelLinesCount + 1 > MAX_PARALLEL_LINES_FREE);

    const hasSelection = selected.size > 0;
    const hasMoreThanOneNodeSelection = React.useMemo(
        () => [...selected].filter(id => graph.current.hasNode(id)).length > 1,
        [selected]
    );
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Check selection type for copy/paste attributes
    const selectionInfo = getSelectedElementsType(graph.current, selected);
    const canCopyAttrs = selected.size === 1;
    const canPasteAttrs =
        selectionInfo.allSameType && (selectionInfo.category === 'node' || selectionInfo.category === 'edge');

    useOutsideClick({
        ref: menuRef,
        handler: onClose,
        enabled: isOpen,
    });

    const refreshAndSave = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch]);

    const handleCopy = useEvent(() => {
        if (selected.size > 0) {
            const s = exportSelectedNodesAndEdges(graph.current, selected);
            navigator.clipboard.writeText(s);
        }
    });

    const handleCut = useEvent(() => {
        if (selected.size > 0) {
            const s = exportSelectedNodesAndEdges(graph.current, selected);
            navigator.clipboard.writeText(s);
            dispatch(clearSelected());
            selected.forEach(s => {
                if (graph.current.hasNode(s)) graph.current.dropNode(s);
                else if (graph.current.hasEdge(s)) graph.current.dropEdge(s);
            });
            refreshAndSave();
        }
    });

    const handlePaste = useEvent(async () => {
        try {
            const s = await navigator.clipboard.readText();
            const { x, y } = pointerPosToSVGCoord(position.x, position.y, svgViewBoxZoom, svgViewBoxMin);
            const { nodes, edges } = importSelectedNodesAndEdges(
                s,
                graph.current,
                isMasterDisabled,
                isParallelDisabled,
                roundToMultiple(x, 5),
                roundToMultiple(y, 5)
            );
            refreshAndSave();
            // select copied nodes automatically
            const allElements = structuredClone(nodes) as Set<Id>;
            edges.forEach(s => allElements.add(s));
            dispatch(setSelected(allElements));
        } catch (error) {
            // Handle clipboard read error
            console.warn('Failed to read clipboard:', error);
        }
    });

    const handleDelete = useEvent(() => {
        if (selected.size > 0) {
            dispatch(clearSelected());
            selected.forEach(s => {
                if (graph.current.hasNode(s)) graph.current.dropNode(s);
                else if (graph.current.hasEdge(s)) graph.current.dropEdge(s);
            });
            refreshAndSave();
        }
    });

    const handleRefresh = useEvent(() => {
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    });

    const handleZIndex = useEvent((zIndex: number) => {
        if (selected.size > 0) {
            const clampedZIndex = Math.min(Math.max(zIndex, -10), 10);
            selected.forEach(id => {
                if (graph.current.hasNode(id)) {
                    graph.current.setNodeAttribute(id, 'zIndex', clampedZIndex);
                }
                if (graph.current.hasEdge(id)) {
                    graph.current.setEdgeAttribute(id, 'zIndex', clampedZIndex);
                }
            });
            refreshAndSave();
        }
    });

    const handlePlaceUp = useEvent(() => {
        if (selected.size > 0) {
            const [selectedFirst] = selected;
            const currentZIndex = graph.current.hasNode(selectedFirst)
                ? graph.current.getNodeAttribute(selectedFirst, 'zIndex')
                : graph.current.hasEdge(selectedFirst)
                  ? graph.current.getEdgeAttribute(selectedFirst, 'zIndex')
                  : 0;
            handleZIndex(currentZIndex + 1);
        }
    });

    const handlePlaceDown = useEvent(() => {
        if (selected.size > 0) {
            const [selectedFirst] = selected;
            let currentZIndex = 0;
            if (graph.current.hasNode(selectedFirst)) {
                currentZIndex = graph.current.getNodeAttribute(selectedFirst, 'zIndex');
            } else if (graph.current.hasEdge(selectedFirst)) {
                currentZIndex = graph.current.getEdgeAttribute(selectedFirst, 'zIndex');
            }
            handleZIndex(currentZIndex - 1);
        }
    });

    const handleCopyAttrs = useEvent(() => {
        if (selected.size !== 1) return;
        const [id] = selected;

        if (graph.current.hasNode(id)) {
            const s = exportNodeSpecificAttrs(graph.current, id as NodeId);
            navigator.clipboard.writeText(s);
        } else if (graph.current.hasEdge(id)) {
            const s = exportEdgeSpecificAttrs(graph.current, id as LineId);
            navigator.clipboard.writeText(s);
        }
    });

    const handlePasteAttrs = useEvent(async () => {
        try {
            const s = await navigator.clipboard.readText();
            const parsed = parseClipboardData(s);
            if (!parsed) return;

            if (parsed.type === 'node-attrs' && selectionInfo.category === 'node') {
                const nodeIds = new Set<NodeId>();
                selected.forEach(id => {
                    if (graph.current.hasNode(id)) {
                        nodeIds.add(id as NodeId);
                    }
                });
                if (importNodeSpecificAttrs(graph.current, nodeIds, parsed.data as NodeSpecificAttrsClipboardData)) {
                    refreshAndSave();
                }
            } else if (parsed.type === 'edge-attrs' && selectionInfo.category === 'edge') {
                const edgeIds = new Set<LineId>();
                selected.forEach(id => {
                    if (graph.current.hasEdge(id)) {
                        edgeIds.add(id as LineId);
                    }
                });
                if (importEdgeSpecificAttrs(graph.current, edgeIds, parsed.data as EdgeSpecificAttrsClipboardData)) {
                    refreshAndSave();
                }
            }
        } catch (error) {
            // Handle clipboard read error
            console.warn('Failed to read clipboard:', error);
        }
    });

    const handleRotate = useEvent((angle: number) => {
        if (rotateSelectedNodes(graph.current, selected, angle)) {
            refreshAndSave();
        }
    });

    const handleFlip = useEvent((direction: 'vertical' | 'horizontal' | 'diagonal45' | 'diagonal135') => {
        if (flipSelectedNodes(graph.current, selected, direction)) {
            refreshAndSave();
        }
    });

    if (!isOpen) return null;

    return (
        <Portal>
            <Box
                ref={menuRef}
                position="fixed"
                left={position.x}
                top={position.y}
                zIndex={1000}
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
                boxShadow="lg"
                py={1}
                minW="150px"
                _dark={{
                    bg: 'gray.700',
                    borderColor: 'gray.600',
                }}
            >
                <MenuItem
                    onClick={() => {
                        handleRefresh();
                        onClose();
                    }}
                >
                    {t('contextMenu.refresh')}
                </MenuItem>
                <Divider />
                <MenuItem
                    onClick={() => {
                        handleCopy();
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.copy')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleCut();
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.cut')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handlePaste();
                        onClose();
                    }}
                >
                    {t('contextMenu.paste')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleDelete();
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.delete')}
                </MenuItem>
                <Divider />
                <MenuItem
                    onClick={() => {
                        handleCopyAttrs();
                        onClose();
                    }}
                    isDisabled={!canCopyAttrs}
                >
                    {t('contextMenu.copyAttrs')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handlePasteAttrs();
                        onClose();
                    }}
                    isDisabled={!canPasteAttrs}
                >
                    {t('contextMenu.pasteAttrs')}
                </MenuItem>
                <Divider />
                <MenuItem
                    onClick={() => {
                        handleZIndex(10);
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.placeTop')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleZIndex(-10);
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.placeBottom')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleZIndex(0);
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.placeDefault')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handlePlaceUp();
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.placeUp')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handlePlaceDown();
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.placeDown')}
                </MenuItem>
                <Divider />
                <MenuItem
                    onClick={() => {
                        handleRotate(45);
                        onClose();
                    }}
                    isDisabled={!hasMoreThanOneNodeSelection}
                >
                    {t('contextMenu.rotateCW')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleRotate(-45);
                        onClose();
                    }}
                    isDisabled={!hasMoreThanOneNodeSelection}
                >
                    {t('contextMenu.rotateCCW')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleFlip('vertical');
                        onClose();
                    }}
                    isDisabled={!hasMoreThanOneNodeSelection}
                >
                    {t('contextMenu.flipVertical')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleFlip('horizontal');
                        onClose();
                    }}
                    isDisabled={!hasMoreThanOneNodeSelection}
                >
                    {t('contextMenu.flipHorizontal')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleFlip('diagonal45');
                        onClose();
                    }}
                    isDisabled={!hasMoreThanOneNodeSelection}
                >
                    {t('contextMenu.flipDiagonal45')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleFlip('diagonal135');
                        onClose();
                    }}
                    isDisabled={!hasMoreThanOneNodeSelection}
                >
                    {t('contextMenu.flipDiagonal135')}
                </MenuItem>
            </Box>
        </Portal>
    );
};

// Custom MenuItem component since we're not using Chakra's Menu
const MenuItem: React.FC<{
    children: React.ReactNode;
    onClick: () => void;
    isDisabled?: boolean;
}> = ({ children, onClick, isDisabled = false }) => (
    <Box
        px={3}
        py={2}
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        opacity={isDisabled ? 0.5 : 1}
        _hover={!isDisabled ? { bg: 'gray.100', _dark: { bg: 'gray.600' } } : {}}
        onClick={isDisabled ? undefined : onClick}
        fontSize="sm"
    >
        {children}
    </Box>
);

export default ContextMenu;
