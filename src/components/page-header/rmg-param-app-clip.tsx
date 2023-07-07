import { SystemStyleObject } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { RmgAppClip } from '@railmapgen/rmg-components';
import { RMGParam } from '../../constants/rmg';

const CHANNEL_PREFIX = 'rmg-bridge--';

const styles: SystemStyleObject = {
    h: 500,
    maxH: '70%',

    '& iframe': {
        h: '100%',
        w: '100%',
    },
};

interface RmgAppClipProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (param: RMGParam) => void;
}

export default function RmgParamAppClip(props: RmgAppClipProps) {
    const { isOpen, onClose, onImport } = props;

    const [appClipId] = useState(crypto.randomUUID());
    const frameUrl =
        '/rmg/import?' +
        new URLSearchParams({
            parentComponent: rmgRuntime.getAppName(),
            parentId: appClipId,
        });

    useEffect(() => {
        const channel = new BroadcastChannel(CHANNEL_PREFIX + appClipId);
        channel.onmessage = ev => {
            const { event, data } = ev.data;
            console.log('[rmp] Received event from RMG app clip:', event);
            if (event === 'CLOSE') {
                onClose();
            } else if (event === 'IMPORT') {
                onImport(data as RMGParam);
            }
        };

        return () => {
            channel.close();
        };
    }, []);

    return (
        <RmgAppClip isOpen={isOpen} onClose={onClose} sx={styles}>
            <iframe src={frameUrl} loading="lazy" />
        </RmgAppClip>
    );
}
