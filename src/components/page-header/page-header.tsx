import WindowHeader from './window-header';
import GlobalAlerts from './global-alerts';

// A simple wrapper that load the following two into a single chunk.
export default function PageHeader() {
    return (
        <>
            <WindowHeader />
            <GlobalAlerts />
        </>
    );
}
