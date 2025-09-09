import { Box, Portal, useOutsideClick } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Id } from '../constants/constants';

interface ContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    selected: Set<Id>;
    onCopy: () => void;
    onCut: () => void;
    onPaste: () => void;
    onDelete: () => void;
    onPlaceTop: () => void;
    onPlaceBottom: () => void;
    onPlaceUp: () => void;
    onPlaceDown: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
    isOpen,
    position,
    onClose,
    selected,
    onCopy,
    onCut,
    onPaste,
    onDelete,
    onPlaceTop,
    onPlaceBottom,
    onPlaceUp,
    onPlaceDown,
}) => {
    const { t } = useTranslation();
    const hasSelection = selected.size > 0;
    const menuRef = React.useRef<HTMLDivElement>(null);

    useOutsideClick({
        ref: menuRef,
        handler: onClose,
        enabled: isOpen,
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
                        onCopy();
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.copy')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        onCut();
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.cut')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        onPaste();
                        onClose();
                    }}
                >
                    {t('contextMenu.paste')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        onDelete();
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.delete')}
                </MenuItem>
                <Box height="1px" bg="gray.200" my={1} _dark={{ bg: 'gray.600' }} />
                <MenuItem
                    onClick={() => {
                        onPlaceTop();
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.placeTop')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        onPlaceBottom();
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.placeBottom')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        onPlaceUp();
                        onClose();
                    }}
                    isDisabled={!hasSelection}
                >
                    {t('contextMenu.placeUp')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        onPlaceDown();
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
