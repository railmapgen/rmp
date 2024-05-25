import { Alert, AlertIcon, AlertStatus, CloseButton, Link } from '@chakra-ui/react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useRootDispatch, useRootSelector } from '../../redux';
import { closeGlobalAlert } from '../../redux/runtime/runtime-slice';

export default function GlobalAlerts() {
    const dispatch = useRootDispatch();

    const globalAlerts = useRootSelector(state => state.runtime.globalAlerts);

    const handleAppOpen = (linkedApp: string) => {
        if (rmgRuntime.isStandaloneWindow()) {
            window.open(`/${linkedApp}`, '_blank');
        } else {
            rmgRuntime.openApp({ appId: linkedApp });
        }
    };

    return (
        <>
            {Object.entries(globalAlerts).map(([status, { message, url, linkedApp }]) => (
                <Alert
                    key={status}
                    status={status as AlertStatus}
                    variant="solid"
                    size="xs"
                    pl={3}
                    pr={1}
                    py={0}
                    zIndex="1"
                >
                    <AlertIcon />
                    {linkedApp ? (
                        <Link onClick={() => handleAppOpen(linkedApp)}>{message}</Link>
                    ) : url ? (
                        <Link href={url} target="_blank">
                            {message}
                        </Link>
                    ) : (
                        message
                    )}
                    <CloseButton ml="auto" onClick={() => dispatch(closeGlobalAlert(status as AlertStatus))} />
                </Alert>
            ))}
        </>
    );
}
