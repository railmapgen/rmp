import { Flex } from '@chakra-ui/react';
import React from 'react';
import WindowHeader from './window-header';
import SvgWrapper from './svg-wrapper';
import ToolsPanel from './panel/tools';
import DetailsPanel from './panel/details';

export default function AppRoot() {
    return (
        <Flex direction="column" height="100%" overflow="hidden">
            <WindowHeader />
            <Flex direction="row" height="100%" overflow="hidden">
                <ToolsPanel />
                <SvgWrapper />
                <DetailsPanel />
            </Flex>
        </Flex>
    );
}
