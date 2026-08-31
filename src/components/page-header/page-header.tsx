import WindowHeader from './window-header';
import GlobalAlerts from './global-alerts';

interface PageHeaderProps {
    onTimelineClick: () => void;
}

// A simple wrapper that load the following two into a single chunk.
export default function PageHeader({ onTimelineClick }: PageHeaderProps) {
    return (
        <>
            <WindowHeader onTimelineClick={onTimelineClick} />
            <GlobalAlerts />
        </>
    );
}
