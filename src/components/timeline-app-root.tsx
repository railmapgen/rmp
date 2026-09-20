import { Alert, AlertIcon, Box } from '@chakra-ui/react';
import { RmgErrorBoundary, RmgThemeProvider, RmgWindow } from '@railmapgen/rmg-components';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TimelineProjectProvider } from '../timeline/timeline-project-context';
import { useTimelineSelector } from '../timeline/timeline-store';
import TimelineWindowHeader from './page-header/timeline-window-header';
import TimelinePage from './pages/timeline-page';
import TimelineProjectHome from './pages/timeline-project-home';
import TimelineOnboardingModal from './timeline/timeline-onboarding-modal';

function TimelineWorkspace() {
    const active = useTimelineSelector(state => state.project.active);
    const error = useTimelineSelector(state => state.project.error);
    const graph = React.useMemo(
        () => (active ? MultiDirectedGraph.from(structuredClone(active.revision.graph)) : undefined),
        [active?.revision.graph]
    );

    const content =
        active && graph ? (
            <TimelineProjectProvider projectId={active.id} graph={graph} revision={active.revision}>
                <TimelineWindowHeader />
                {error && (
                    <Alert status="error" size="sm">
                        <AlertIcon />
                        {error}
                    </Alert>
                )}
                <Box flex="1" minH={0}>
                    <TimelinePage />
                </Box>
                <TimelineOnboardingModal projectId={active.id} />
            </TimelineProjectProvider>
        ) : (
            <>
                <TimelineWindowHeader />
                <Box flex="1" minH={0}>
                    <TimelineProjectHome />
                </Box>
            </>
        );

    return <>{content}</>;
}

export default function TimelineAppRoot() {
    return (
        <RmgThemeProvider>
            <RmgWindow>
                <BrowserRouter basename={import.meta.env.BASE_URL}>
                    <RmgErrorBoundary allowReset>
                        <Routes>
                            <Route path="/timeline" element={<TimelineWorkspace />} />
                            <Route path="*" element={<Navigate to="/timeline" replace />} />
                        </Routes>
                    </RmgErrorBoundary>
                </BrowserRouter>
            </RmgWindow>
        </RmgThemeProvider>
    );
}
