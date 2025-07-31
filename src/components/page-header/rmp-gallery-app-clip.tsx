import { CloseButton, SystemStyleObject, useDisclosure } from '@chakra-ui/react';
import { RmgAppClip } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Events } from '../../constants/constants';
import { shared_work_endpoint } from '../../constants/server';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph, setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import {
    clearSelected,
    refreshEdgesThunk,
    refreshNodesThunk,
    setRefreshParam,
} from '../../redux/runtime/runtime-slice';
import { RMPSave, upgrade } from '../../util/save';
import ConfirmOverwriteDialog from './confirm-overwrite-dialog';

const RMP_GALLERY_CHANNEL_NAME = 'RMP_GALLERY_CHANNEL';
const RMP_GALLERY_CHANNEL_EVENT = 'OPEN_TEMPLATE';
const CHN = new BroadcastChannel(RMP_GALLERY_CHANNEL_NAME);

const styles: SystemStyleObject = {
    h: '80%',
    w: '80%',

    '& iframe': {
        h: '100%',
        w: '100%',
    },

    '& div': {
        h: '100%',
        w: '100%',
    },
};

interface RmpGalleryAppClipProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RmpGalleryAppClip(props: RmpGalleryAppClipProps) {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
    const [workToLoad, setWorkToLoad] = React.useState<RMPSave | null>(null);

    const {
        telemetry: { project: isAllowProjectTelemetry },
    } = useRootSelector(state => state.app);
    const isAllowAppTelemetry = rmgRuntime.isAllowAnalytics();

    const graph = React.useRef(window.graph);

    const refreshAndSave = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch, refreshNodesThunk, refreshEdgesThunk, saveGraph, graph]);

    const handleOpenTemplate = async (rmpSave: RMPSave) => {
        // templates may be obsolete and require upgrades
        const { version, ...save } = JSON.parse(await upgrade(JSON.stringify(rmpSave))) as RMPSave;

        // details panel will complain about unknown nodes or edges if the last selected is not cleared
        dispatch(clearSelected());

        // reset graph with new data
        graph.current.clear();
        graph.current.import(save.graph);
        dispatch(setRefreshParam());

        // hard refresh the canvas
        refreshAndSave();

        // load svg view box related settings from the save
        const { svgViewBoxZoom, svgViewBoxMin } = save;
        if (typeof svgViewBoxZoom === 'number') dispatch(setSvgViewBoxZoom(svgViewBoxZoom));
        if (typeof svgViewBoxMin.x === 'number' && typeof svgViewBoxMin.y === 'number')
            dispatch(setSvgViewBoxMin(svgViewBoxMin));
    };

    const handleConfirmOpen = async () => {
        if (workToLoad) {
            await handleOpenTemplate(workToLoad);
        }
        onConfirmClose();
        setWorkToLoad(null);
    };

    const fetchAndApplyTemplate = async (id: string, host?: string) => {
        const urlPrefix = host ? `https://${host}` : '';
        const template = (await (
            (
                await Promise.allSettled([
                    fetch(`${urlPrefix}/rmp-gallery/resources/real_world/${id}.json`),
                    fetch(`${urlPrefix}/rmp-gallery/resources/fantasy/${id}.json`),
                ])
            ).filter(rep => rep.status === 'fulfilled') as PromiseFulfilledResult<Response>[]
        )
            .find(rep => rep.value.status === 200)
            ?.value.json()) as RMPSave | undefined;
        if (template) {
            setWorkToLoad(template);
            onConfirmOpen();

            if (isAllowAppTelemetry) {
                const data: { id: string; host?: string } = { id };
                if (isAllowProjectTelemetry && host) data.host = host;
                rmgRuntime.event(Events.IMPORT_WORK_FROM_GALLERY, data);
            }
            rmgRuntime.sendNotification({
                title: t('header.open.importOK', { id }),
                message: t('header.open.importOKContent'),
                type: 'success',
                duration: 9000,
            });
        } else {
            rmgRuntime.sendNotification({
                title: t('header.open.importFail', { id }),
                message: t('header.open.importFailContent'),
                type: 'error',
                duration: 9000,
            });
        }
    };

    const fetchAndApplyShare = async (s: string) => {
        try {
            const rep = await fetch(`${shared_work_endpoint}/${s}`);
            if (rep.status !== 200) {
                throw new Error(t('header.open.importFailContent'));
            }
            const work = await rep.json();
            setWorkToLoad(work as RMPSave);
            onConfirmOpen();

            if (isAllowAppTelemetry) {
                rmgRuntime.event(Events.IMPORT_WORK_FROM_SHARE, { share: s });
            }
            rmgRuntime.sendNotification({
                title: t('header.open.importOK', { id: s }),
                message: t('header.open.importOKContent'),
                type: 'success',
                duration: 9000,
            });
        } catch (e) {
            rmgRuntime.sendNotification({
                title: t('header.open.importFail', { id: s }),
                message: (e as Error).message,
                type: 'error',
                duration: 9000,
            });
        }
    };

    // A one time url match to see if it is a work share link and apply the work if needed.
    //
    // Since rmt will pass all params in `searchParams` here,
    // e.g. https://railmapgen.github.io/?app=rmp&searchParams=id.hostname
    // we will split id and host name from it and `fetchAndApplyTemplate`.
    //
    // It's really ugly to have multiple search params in searchParams after `encodeURIComponent`,
    // so we are joining id and host by '.'.
    React.useEffect(() => {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        if (searchParams.size > 0) {
            const params = searchParams.keys().next()['value'] as string;
            const firstDotIndex = params.indexOf('.');
            const id = params.substring(0, firstDotIndex === -1 ? undefined : firstDotIndex);
            let host: string | undefined = undefined;
            if (firstDotIndex !== -1) host = params.substring(firstDotIndex + 1);
            if (host === 'org') fetchAndApplyShare(id);
            else fetchAndApplyTemplate(id, host);
            // clear the search params in rmt, otherwise it will be preserved and re-imported every time
            rmgRuntime.updateAppMetadata({ search: '' });
        }
    }, []);

    React.useEffect(() => {
        CHN.onmessage = e => {
            const { event, data: id } = e.data;
            if (event === RMP_GALLERY_CHANNEL_EVENT) {
                fetchAndApplyTemplate(id);
                onClose();
            }
        };
        return () => CHN.close();
    }, []);

    return (
        <>
            <RmgAppClip isOpen={isOpen} onClose={onClose} size="full" sx={styles}>
                <iframe src="/rmp-gallery/" loading="lazy" />
                <CloseButton onClick={onClose} position="fixed" top="5px" right="15px" />
            </RmgAppClip>
            <ConfirmOverwriteDialog isOpen={isConfirmOpen} onClose={onConfirmClose} onConfirm={handleConfirmOpen} />
        </>
    );
}
