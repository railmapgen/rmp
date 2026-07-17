import React from 'react';
import { IconButton, Popover, PopoverBody, PopoverContent, PopoverTrigger } from '@chakra-ui/react';
import { MdZoomOut, MdZoomIn } from 'react-icons/md';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useRootSelector, useRootDispatch } from '../../redux/index';
import { setSvgViewBoxZoom } from '../../redux/param/param-slice';

/**
 * A zoom control displayed in popover component.
 * This will greatly decrease the width of the header in mobile device.
 */
export const ZoomPopover = () => {
    const [isOpen, setIsOpen] = React.useState(false);

    const { svgViewBoxZoom } = useRootSelector(state => state.param);
    const dispatch = useRootDispatch();

    const fields: RmgFieldsField[] = [
        {
            type: 'slider',
            label: '',
            value: 400 - svgViewBoxZoom,
            min: 10,
            max: 390,
            step: 1,
            onChange: value => dispatch(setSvgViewBoxZoom(400 - value)),
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
