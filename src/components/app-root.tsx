import React, { Suspense } from 'react';
import { RmgErrorBoundary, RmgWindow } from '@railmapgen/rmg-components';
import { Flex } from '@chakra-ui/react';

const WindowHeader = React.lazy(() => import(/* webpackChunkName: "WindowHeader" */ './page-header/window-header'));
const ToolsPanel = React.lazy(() => import(/* webpackChunkName: "ToolsPanel" */ './panels/tools/tools'));
const SvgWrapper = React.lazy(() => import(/* webpackChunkName: "SvgWrapper" */ './svg-wrapper'));
const DetailsPanel = React.lazy(() => import(/* webpackChunkName: "DetailsPanel" */ './panels/details/details'));

export default function AppRoot() {
    return (
        <RmgWindow>
            <Suspense
                fallback={
                    <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        Initializing Rail Map Painter core...
                    </p>
                }
            >
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
            </Suspense>
        </RmgWindow>
    );
}
