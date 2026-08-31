import { CloseButton, SystemStyleObject } from '@chakra-ui/react';
import { RmgAppClip } from '@railmapgen/rmg-components';
import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import React from 'react';
import { Theme } from '../../constants/constants';

const CHANNEL_PREFIX = 'rmg-palette-bridge--';

const styles: SystemStyleObject = {
    position: 'relative',
    h: 460,
    maxH: '70%',

    '& > button': {
        position: 'absolute',
        right: 1,
        top: 1,
    },

    '& iframe': {
        h: '100%',
        w: '100%',
    },
};

interface RmgPaletteAppClip {
    isOpen: boolean;
    onClose: () => void;
    defaultTheme?: Theme;
    onSelect: (theme: Theme) => void;
}

export default function RmgPaletteAppClip(props: RmgPaletteAppClip) {
    const { isOpen, onClose, defaultTheme, onSelect } = props;

    const [appClipId] = React.useState(crypto.randomUUID());
    const [isLoaded, setIsLoaded] = React.useState(false);

    // Use the same-origin relative path so the Vite dev-server proxy (and the
    // production same-host deployment) serves rmg-palette from the SAME origin.
    // BroadcastChannel only works between same-origin documents — an absolute
    // cross-origin URL (https://railmapgen.org/...) silently breaks LOADED/CLOSE/SELECT.
    const frameUrl =
        '/rmg-palette/#/picker?' +
        new URLSearchParams({
            parentComponent: rmgRuntime.getAppName(),
            parentId: appClipId,
        });

    const channelRef = React.useRef<BroadcastChannel | undefined>(undefined);

    React.useEffect(() => {
        const channel = new BroadcastChannel(CHANNEL_PREFIX + appClipId);
        channelRef.current = channel;

        channel.onmessage = ev => {
            const { event, data } = ev.data;
            logger.debug('[rmp] Received event from Palette app clip:', event);
            if (event === 'CLOSE') {
                onClose();
            } else if (event === 'SELECT') {
                onSelect(data as Theme);
            } else if (event === 'LOADED') {
                // force trigger default theme update again when app clip first opened
                setIsLoaded(true);
            }
        };

        return () => {
            channel.close();
            channelRef.current = undefined;
        };
    }, []);

    React.useEffect(() => {
        if (!isOpen || !isLoaded || !defaultTheme) return;
        const message = { event: 'OPEN', data: [...defaultTheme] as Theme };
        channelRef.current?.postMessage(message);
        const retryId = window.setTimeout(() => channelRef.current?.postMessage(message), 100);
        return () => window.clearTimeout(retryId);
    }, [isOpen, isLoaded, JSON.stringify(defaultTheme)]);

    return (
        <RmgAppClip size="md" isOpen={isOpen} onClose={onClose} sx={styles}>
            <CloseButton onClick={onClose} />
            <iframe src={frameUrl} loading="eager" />
        </RmgAppClip>
    );
}
