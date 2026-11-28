import { IconButton, Tooltip, useDisclosure, useToast } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdMap } from 'react-icons/md';
import { registerRmpMapReceiver } from '../../map/map-transfer';
import { useRootSelector } from '../../redux';
import { MapLibraryModal } from './map-library';

export const MapToggleButton = () => {
    const { t } = useTranslation();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const mapEnabled = useRootSelector(state => state.param.present.mapEnabled);
    const label = t('mapLibrary.title');

    React.useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        return registerRmpMapReceiver(name =>
            toast({ title: t('mapLibrary.imported'), description: name, status: 'success', isClosable: true })
        );
    }, [t, toast]);

    return (
        <>
            <Tooltip label={label} hasArrow>
                <IconButton
                    size="sm"
                    variant="ghost"
                    colorScheme="gray"
                    isActive={mapEnabled}
                    aria-label={label}
                    aria-pressed={mapEnabled}
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    icon={<MdMap />}
                    onClick={onOpen}
                />
            </Tooltip>
            <MapLibraryModal isOpen={isOpen} onClose={onClose} />
        </>
    );
};
