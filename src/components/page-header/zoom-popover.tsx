import React from 'react';
import { IconButton, Popover, PopoverBody, PopoverContent, PopoverTrigger } from '@chakra-ui/react';
import { MdZoomOut, MdZoomIn } from 'react-icons/md';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MAP_MAX_VIEWBOX_ZOOM } from '../../map/map-config';
import { useRootSelector, useRootDispatch } from '../../redux/index';
import { setSvgViewBoxZoom } from '../../redux/param/param-slice';

const MAP_HIDDEN_MAX_ZOOM = 400;
const ZOOM_SLIDER_MARGIN = 10;

/**
 * A zoom control displayed in popover component.
 * This will greatly decrease the width of the header in mobile device.
 */
export const ZoomPopover = () => {
    const [isOpen, setIsOpen] = React.useState(false);

    const { mapEnabled, svgViewBoxZoom } = useRootSelector(state => state.param.present);
    const dispatch = useRootDispatch();
    const maxZoom = mapEnabled ? MAP_MAX_VIEWBOX_ZOOM : MAP_HIDDEN_MAX_ZOOM;

    const fields: RmgFieldsField[] = [
        {
            type: 'slider',
            label: '',
            value: maxZoom - svgViewBoxZoom,
            min: ZOOM_SLIDER_MARGIN,
            max: maxZoom - ZOOM_SLIDER_MARGIN,
            step: 1,
            onChange: value => dispatch(setSvgViewBoxZoom(maxZoom - value)),
            leftIcon: <MdZoomOut />,
            rightIcon: <MdZoomIn />,
            minW: 160,
        },
    ];

    return (
        <Popover isOpen={isOpen} onOpen={() => setIsOpen(true)} onClose={() => setIsOpen(false)}>
            <PopoverTrigger>
                <IconButton
                    aria-label="zoom"
                    variant="ghost"
                    size="sm"
                    icon={<MdZoomIn />}
                    onClick={() => setIsOpen(!isOpen)}
                />
            </PopoverTrigger>
            <PopoverContent>
                <PopoverBody>
                    <RmgFields fields={fields} noLabel />
                </PopoverBody>
            </PopoverContent>
        </Popover>
    );
};
