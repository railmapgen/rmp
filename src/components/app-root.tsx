import React from 'react';
import { Flex } from '@chakra-ui/react';
import { RmgErrorBoundary, RmgThemeProvider, RmgWindow } from '@railmapgen/rmg-components';

const PageHeader = React.lazy(() => import(/* webpackChunkName: "WindowHeader" */ './page-header/page-header'));
const ToolsPanel = React.lazy(() => import(/* webpackChunkName: "ToolsPanel" */ './panels/tools/tools'));
const SvgWrapper = React.lazy(() => import(/* webpackChunkName: "SvgWrapper" */ './svg-wrapper'));
const DetailsPanel = React.lazy(() => import(/* webpackChunkName: "DetailsPanel" */ './panels/details/details'));

export default function AppRoot() {
    React.useEffect(() => {
        (async () => {
            const res = await fetch(process.env.PUBLIC_URL + '/styles/fonts_mtr.css');
            if (!res.ok) return;
            const cssContent = await res.text();
            const style = document.createElement('style');
            style.id = 'fonts_mtr';
            style.appendChild(document.createTextNode(cssContent));
            document.head.append(style);
        })();

        // const link = document.createElement('link');
        // link.type = 'text/css';
        // link.id = 'fonts_mtr';
        // link.href = process.env.PUBLIC_URL + '/styles/fonts_mtr.css';
        // document.head.append(link);
        return () => {
            // document.head.removeChild(link);
        };
    }, []);
    return (
        <RmgThemeProvider>
            <RmgWindow>
                <React.Suspense
                    fallback={
                        <p
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            Initializing Rail Map Painter core...
                        </p>
                    }
                >
                    <PageHeader />
                    <RmgErrorBoundary allowReset>
                        <Flex direction="row" height="100%" overflow="hidden" sx={{ position: 'relative' }}>
                            {/* `position: 'relative'` is used to make sure RmgSidePanel in DetailsPanel
                            have the right parent container for its `position: 'absolute'` calculation. */}
                            <ToolsPanel />
                            <SvgWrapper />
                            <DetailsPanel />
                        </Flex>
                    </RmgErrorBoundary>
                </React.Suspense>
            </RmgWindow>
        </RmgThemeProvider>
    );
}
