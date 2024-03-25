import { CloseButton, Flex, Icon, Link, SystemStyleObject, Text, useToast } from '@chakra-ui/react';
import { RmgAppClip } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOpenInNew } from 'react-icons/md';
import { Events } from '../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph, setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
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
    const toast = useToast();
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const {
        telemetry: { app: isAllowAppTelemetry, project: isAllowProjectTelemetry },
    } = useRootSelector(state => state.app);

    const graph = React.useRef(window.graph);
    const inst = rmgRuntime.getInstance();

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

        // hard refresh the canvas
        refreshAndSave();

        // load svg view box related settings from the save
        const { svgViewBoxZoom, svgViewBoxMin } = save;
        if (typeof svgViewBoxZoom === 'number') dispatch(setSvgViewBoxZoom(svgViewBoxZoom));
        if (typeof svgViewBoxMin.x === 'number' && typeof svgViewBoxMin.y === 'number')
            dispatch(setSvgViewBoxMin(svgViewBoxMin));
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
            if (isAllowAppTelemetry) {
                const data: { id: string; host?: string } = { id };
                if (isAllowProjectTelemetry && host) data['host'] = host;
                rmgRuntime.event(Events.IMPORT_WORK_FROM_GALLERY, data);
            }
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

    // A one time url match to see if it is a work share link and apply the work if needed.
    React.useEffect(() => {
        const url = new URL(window.location.href);
        const path = url.pathname;
        if (path.includes('/s/')) {
            history.replaceState({}, t('about.rmp'), url.pathname.substring(0, url.pathname.indexOf('s/')));
            const id = path.substring(path.lastIndexOf('s/') + 2);
            const host = url.searchParams.get('host') ?? undefined;
            fetchAndApplyTemplate(id, host);
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
        <RmgAppClip isOpen={isOpen} onClose={onClose} size="full" sx={styles}>
            {inst === 'Gitee' ? <DisabledGallery /> : <iframe src="/rmp-gallery/" loading="lazy" />}
            <CloseButton onClick={onClose} position="fixed" top="5px" right="15px" />
        </RmgAppClip>
    );
}

const DisabledGallery = () => (
    <Flex flexDirection="column" p="10">
        <Text>抱歉，由于托管平台的敏感词限制，画廊已被禁用 ):</Text>
        <br />
        <Text>欢迎切换到Github或Gitlab镜像以使用完整版本 :)</Text>
        <br style={{ marginBottom: 5 }} />
        <Link color="teal.500" href="https://railmapgen.github.io/?app=rmp-gallery" isExternal>
            https://railmapgen.github.io/?app=rmp-gallery <Icon as={MdOpenInNew} />
        </Link>
        <br />
        <Link color="teal.500" href="https://railmapgen.gitlab.io/?app=rmp-gallery" isExternal>
            https://railmapgen.gitlab.io/?app=rmp-gallery <Icon as={MdOpenInNew} />
        </Link>
    </Flex>
);
