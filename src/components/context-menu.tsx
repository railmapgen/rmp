import { Box, Portal, useOutsideClick } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import useEvent from 'react-use-event-hook';
import { Id } from '../constants/constants';
import { MAX_MASTER_NODE_FREE } from '../constants/master';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/param/param-slice';
import { clearSelected, refreshEdgesThunk, refreshNodesThunk, setSelected } from '../redux/runtime/runtime-slice';
import { exportSelectedNodesAndEdges, importSelectedNodesAndEdges } from '../util/clipboard';
import { pointerPosToSVGCoord, roundToMultiple } from '../util/helpers';
import { MAX_PARALLEL_LINES_FREE } from '../util/parallel';

interface ContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, position, onClose }) => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const {
        selected,
        count: { masters: masterNodesCount, lines: parallelLinesCount },
    } = useRootSelector(state => state.runtime);
    const { svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param);
    const { activeSubscriptions } = useRootSelector(state => state.account);

    const isMasterDisabled = !activeSubscriptions.RMP_CLOUD && masterNodesCount + 1 > MAX_MASTER_NODE_FREE;
    const isParallelDisabled = !activeSubscriptions.RMP_CLOUD && parallelLinesCount + 1 > MAX_PARALLEL_LINES_FREE;

    const hasSelection = selected.size > 0;
    const menuRef = React.useRef<HTMLDivElement>(null);

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
            const currentZIndex = graph.current.hasNode(selectedFirst)
                ? graph.current.getNodeAttribute(selectedFirst, 'zIndex')
                : graph.current.hasEdge(selectedFirst)
                  ? graph.current.getEdgeAttribute(selectedFirst, 'zIndex')
                  : 0;
            handleZIndex(currentZIndex - 1);
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
                <MenuItem
                    onClick={() => {
                        handleRefresh();
                        onClose();
                    }}
                >
                    {t('contextMenu.refresh')}
                </MenuItem>
                <Box height="1px" bg="gray.200" my={1} _dark={{ bg: 'gray.600' }} />
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
