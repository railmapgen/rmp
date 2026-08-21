import { IconButton, Tooltip } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { MdMap } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setMapEnabled } from '../../redux/param/param-slice';

export const MapToggleButton = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const mapEnabled = useRootSelector(state => state.param.present.mapEnabled);
    const label = t(mapEnabled ? 'header.mapToggle.hide' : 'header.mapToggle.show');

    return (
        <Tooltip label={label} hasArrow>
            <IconButton
                size="sm"
                variant="ghost"
                colorScheme="gray"
                isActive={mapEnabled}
                aria-label={label}
                aria-pressed={mapEnabled}
                icon={<MdMap />}
                onClick={() => dispatch(setMapEnabled(!mapEnabled))}
            />
        </Tooltip>
    );
};
