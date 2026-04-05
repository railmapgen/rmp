import { Flex } from '@chakra-ui/react';
import React from 'react';

const ToolsPanel = React.lazy(() => import('../panels/tools/tools'));
const SvgWrapper = React.lazy(() => import('../svg-wrapper'));
const DetailsPanel = React.lazy(() => import('../panels/details/details'));

export default function EditorPage() {
    return (
        <Flex direction="row" height="100%" overflow="hidden" sx={{ position: 'relative' }}>
            {/* `position: 'relative'` is used to make sure RmgSidePanel in DetailsPanel
            have the right parent container for its `position: 'absolute'` calculation. */}
            <React.Suspense fallback={null}>
                <ToolsPanel />
            </React.Suspense>
            <React.Suspense fallback={null}>
                <SvgWrapper />
            </React.Suspense>
            <React.Suspense fallback={null}>
                <DetailsPanel />
            </React.Suspense>
        </Flex>
    );
}
