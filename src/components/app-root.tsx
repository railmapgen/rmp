import React from 'react';
import WindowHeader from './page-header/window-header';
import SvgWrapper from './svg-wrapper';
import ToolsPanel from './panel/tools';
import DetailsPanel from './panel/details';
import { RmgWindow } from '@railmapgen/rmg-components';
import { Flex } from '@chakra-ui/react';

export default function AppRoot() {
    return (
        <RmgWindow>
            <WindowHeader />
            <Flex direction="row" height="100%" overflow="hidden">
                <ToolsPanel />
                <SvgWrapper />
                <DetailsPanel />
            </Flex>
        </RmgWindow>
    );
}
