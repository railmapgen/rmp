import { Badge, IconButton, Menu, MenuButton, MenuItem, MenuList, useToast } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdInsertDriveFile, MdNoteAdd, MdUpload } from 'react-icons/md';
import { useRootDispatch } from '../../redux';
import { saveGraph, setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { clearSelected, setGlobalAlert, setRefreshEdges, setRefreshNodes } from '../../redux/runtime/runtime-slice';
import { parseRmgParam } from '../../util/rmg-param-parser';
import { RMPSave, upgrade } from '../../util/save';
import { GalleryModal } from './gallery-modal';
import RmgParamAppClip from './rmg-param-app-clip';

const RMP_GALLERY_CHANNEL_NAME = 'RMP_GALLERY_CHANNEL';
const RMP_GALLERY_CHANNEL_EVENT = 'OPEN_TEMPLATE';
const CHN = new BroadcastChannel(RMP_GALLERY_CHANNEL_NAME);

export default function OpenActions() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const toast = useToast();

    const graph = React.useRef(window.graph);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [isGalleryModalOpen, setIsGalleryModalOpen] = React.useState(false);
    const [isRmgParamAppClipOpen, setIsRmgParamAppClipOpen] = React.useState(false);

    const refreshAndSave = React.useCallback(() => {
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefreshNodes, setRefreshEdges, saveGraph, graph]);

    const handleNew = () => {
        dispatch(clearSelected());
        graph.current.clear();
        dispatch(setSvgViewBoxZoom(100));
        dispatch(setSvgViewBoxMin({ x: 0, y: 0 }));
        refreshAndSave();
    };

    const handleImportRMGProject = (param: Record<string, any>) => {
        try {
            parseRmgParam(graph.current, param);
            refreshAndSave();
        } catch (err) {
            dispatch(setGlobalAlert({ status: 'error', message: t('OpenActions.unknownError') }));
            console.error('OpenActions.handleUploadRMG():: Unknown error occurred while parsing the RMG project', err);
        } finally {
            setIsRmgParamAppClipOpen(false);
        }
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        console.log('OpenActions.handleUpload():: received file', file);

        if (file?.type !== 'application/json') {
            dispatch(setGlobalAlert({ status: 'error', message: t('OpenActions.invalidType') }));
            console.error('OpenActions.handleUpload():: Invalid file type! Only file in JSON format is accepted.');
        } else {
            try {
                const paramStr = await readFileAsText(file);
                const { version, ...save } = JSON.parse(await upgrade(paramStr));

                // details panel will complain about unknown nodes or edges if the last selected is not cleared
                dispatch(clearSelected());

                // rest graph with new data
                graph.current.clear();
                graph.current.import(save.graph);

                refreshAndSave();
            } catch (err) {
                dispatch(setGlobalAlert({ status: 'error', message: t('OpenActions.unknownError') }));
                console.error(
                    'OpenActions.handleUpload():: Unknown error occurred while parsing the uploaded file',
                    err
                );
            }
        }

        // clear field for next upload
        event.target.value = '';
    };

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
            ).find(res => res.status === 'fulfilled') as PromiseFulfilledResult<Response> | undefined
        )?.value.json()) as RMPSave | undefined;
        if (template) handleOpenTemplate(template);
    };

    // A one time url match to see if it is a template share link and apply the template if needed.
    React.useEffect(() => {
        const url = window.location.href;
        if (url.includes('/s/')) {
            history.replaceState({}, 'Rail Map Painter', url.substring(0, url.indexOf('s/')));

            const id = url.substring(url.lastIndexOf('s/') + 2);
            fetchAndApplyTemplate(id);
        }
    }, []);

    React.useEffect(() => {
        CHN.onmessage = e => {
            const { event, data: id } = e.data;
            if (event === RMP_GALLERY_CHANNEL_EVENT) {
                fetchAndApplyTemplate(id);
                setIsGalleryModalOpen(false);
                toast({
                    title: t('header.open.importFromRMPGallery', { id }),
                    status: 'success' as const,
                    duration: 9000,
                    isClosable: true,
                });
            }
        };
    }, []);

    return (
        <Menu>
            <MenuButton as={IconButton} size="sm" variant="ghost" icon={<MdUpload />} />
            <MenuList>
                <MenuItem icon={<MdNoteAdd />} onClick={handleNew}>
                    {t('header.open.new')}
                </MenuItem>

                <input
                    id="upload_project"
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    hidden={true}
                    onChange={handleUpload}
                    data-testid="file-upload"
                />
                <MenuItem icon={<MdUpload />} onClick={() => fileInputRef?.current?.click()}>
                    {t('header.open.config')}
                </MenuItem>

                <MenuItem icon={<MdInsertDriveFile />} onClick={() => setIsRmgParamAppClipOpen(true)}>
                    {t('header.open.projectRMG')}
                </MenuItem>

                <MenuItem icon={<MdInsertDriveFile />} onClick={() => setIsGalleryModalOpen(true)}>
                    {t('header.open.gallery')}
                    <Badge ml="1" colorScheme="green">
                        New
                    </Badge>
                </MenuItem>
                <GalleryModal isOpen={isGalleryModalOpen} onClose={() => setIsGalleryModalOpen(false)} />
            </MenuList>

            <RmgParamAppClip
                isOpen={isRmgParamAppClipOpen}
                onClose={() => setIsRmgParamAppClipOpen(false)}
                onImport={handleImportRMGProject}
            />
        </Menu>
    );
}

const readFileAsText = (file: File) => {
    return new Promise((resolve: (text: string) => void) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsText(file);
    });
};
