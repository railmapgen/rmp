import React from 'react';
import WindowHeader from './page-header/window-header';
import SvgWrapper from './svg-wrapper';
import ToolsPanel from './panel/tools/tools';
import DetailsPanel from './panel/details/details';
import { RmgErrorBoundary, RmgWindow } from '@railmapgen/rmg-components';
import { Flex } from '@chakra-ui/react';

export default function AppRoot() {
    return (
        <RmgWindow>
            <WindowHeader />
            <RmgErrorBoundary allowReset>
                <Flex direction="row" height="100%" overflow="hidden" sx={{ position: 'relative' }}>
                    {/* `position: 'relative'` is used to make sure RmgSidePanel in DetailsPanel
                        have the right parent container for its `position: 'absolute'` calculation. */}
                    <ToolsPanel />
                    <SvgWrapper />
                    <DetailsPanel />
                </Flex>
            </RmgErrorBoundary>
        </RmgWindow>
    );
}
