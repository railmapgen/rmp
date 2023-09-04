import { Box, CloseButton, IconButton, SystemStyleObject, useToast } from '@chakra-ui/react';
import { RmgAppClip } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdClose } from 'react-icons/md';
import { useRootDispatch } from '../../redux';
import { saveGraph } from '../../redux/param/param-slice';
import { clearSelected, setRefreshEdges, setRefreshNodes } from '../../redux/runtime/runtime-slice';
import { RMPSave, upgrade } from '../../util/save';

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
};

interface RmpGalleryAppClipProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RmpGalleryAppClip(props: RmpGalleryAppClipProps) {
    const { isOpen, onClose } = props;
    const toast = useToast();
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const graph = React.useRef(window.graph);

    const refreshAndSave = React.useCallback(() => {
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefreshNodes, setRefreshEdges, saveGraph, graph]);

    const handleOpenTemplate = async (rmpSave: RMPSave) => {
        // templates may be obsolete and require upgrades
        const { version, ...save } = JSON.parse(await upgrade(JSON.stringify(rmpSave))) as RMPSave;

        // details panel will complain about unknown nodes or edges if the last selected is not cleared
        dispatch(clearSelected());

        // rest graph with new data
        graph.current.clear();
        graph.current.import(save.graph);

        refreshAndSave();
    };

    const fetchAndApplyTemplate = async (id: string) => {
        const template = (await (
            (
                await Promise.allSettled([
                    fetch(`/rmp-gallery/resources/real_world/${id}.json`),
                    fetch(`/rmp-gallery/resources/fantasy/${id}.json`),
                ])
            ).filter(rep => rep.status === 'fulfilled') as PromiseFulfilledResult<Response>[]
        )
            .find(rep => rep.value.status === 200)
            ?.value.json()) as RMPSave | undefined;
        if (template) {
            handleOpenTemplate(template);
            toast({
                title: t('header.open.importFromRMPGallery', { id }),
                status: 'success' as const,
                duration: 9000,
                isClosable: true,
            });
        } else {
            toast({
                title: t('header.open.failToImportFromRMPGallery', { id }),
                status: 'error' as const,
                duration: 9000,
                isClosable: true,
            });
        }
    };

    // A one time url match to see if it is a template share link and apply the template if needed.
    React.useEffect(() => {
        const url = window.location.href;
        if (url.includes('/s/')) {
            history.replaceState({}, t('about.rmp'), url.substring(0, url.indexOf('s/')));

            const id = url.substring(url.lastIndexOf('s/') + 2);
            fetchAndApplyTemplate(id);
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
    }, []);

    return (
        <>
            <RmgAppClip isOpen={isOpen} onClose={onClose} size="full" sx={styles}>
                <iframe src="/rmp-gallery/" loading="lazy" />
                <CloseButton onClick={onClose} position="fixed" top="5px" right="15px" />
            </RmgAppClip>
        </>
    );
}
