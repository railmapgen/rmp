import { Badge, IconButton, Menu, MenuButton, MenuItem, MenuList, useDisclosure } from '@chakra-ui/react';
import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdInsertDriveFile, MdNoteAdd, MdOpenInNew, MdSchool, MdUpload } from 'react-icons/md';
import { EdgeAttributes, Events, GraphAttributes, LocalStorageKey, NodeAttributes } from '../../constants/constants';
import { GlobalAlertId } from '../../constants/global-alerts';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { replaceProject } from '../../redux/project-history';
import { setGlobalAlert } from '../../redux/runtime/runtime-slice';
import { getCanvasSize } from '../../util/helpers';
import { useWindowSize } from '../../util/hooks';
import { pullServerImages, saveImagesFromParam } from '../../util/image';
import { saveManagerChannel, SaveManagerEvent, SaveManagerEventType } from '../../util/rmt-save';
import { getInitialParam, parseVersionFromSave, RMPSave, upgrade } from '../../util/save';
import ConfirmOverwriteDialog from './confirm-overwrite-dialog';
import ImportFromAarc from './import-from-aarc';
import RmgParamAppClip from './rmg-param-app-clip';
import RmpGalleryAppClip from './rmp-gallery-app-clip';

export default function OpenActions() {
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const mapStyle = useRootSelector(state => state.param.present.mapStyle);
    const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
    const [paramToLoad, setParamToLoad] = React.useState<string | null>(null);
    const [versionToLoad, setVersionToLoad] = React.useState<number>(0);

    const size = useWindowSize();
    const { height } = getCanvasSize(size);

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [isRmgParamAppClipOpen, setIsRmgParamAppClipOpen] = React.useState(false);
    const [isOpenGallery, setIsOpenGallery] = React.useState(false);
    const [isOpenAarc, setIsOpenAarc] = React.useState(false);

    const handleNew = () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>().export();
        dispatch(
            replaceProject({
                mapEnabled: false,
                graph,
                mapStyle,
                svgViewBoxZoom: 100,
                svgViewBoxMin: { x: 0, y: 0 },
            })
        );
    };

    const loadParam = async (paramStr: string) => {
        // templates may be obsolete and require upgrades
        const { version, images, ...save } = JSON.parse(await upgrade(paramStr)) as RMPSave;

        const nextGraph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        nextGraph.import(save.graph);

        // save images to indexedDB if they exist
        if (Array.isArray(images) && images.length > 0) {
            await saveImagesFromParam(nextGraph, images);
        }

        const { svgViewBoxZoom, svgViewBoxMin } = save;
        dispatch(
            replaceProject({
                mapEnabled: save.mapEnabled,
                graph: nextGraph.export(),
                mapStyle: save.mapStyle,
                svgViewBoxZoom: typeof svgViewBoxZoom === 'number' ? svgViewBoxZoom : 100,
                svgViewBoxMin:
                    typeof svgViewBoxMin.x === 'number' && typeof svgViewBoxMin.y === 'number'
                        ? svgViewBoxMin
                        : { x: 0, y: 0 },
            })
        );

        // ensure all server images used in the graph are available in IndexedDB
        dispatch(pullServerImages());
    };

    const handleConfirmLoad = async () => {
        if (paramToLoad) {
            await loadParam(paramToLoad);

            const initialParam = await getInitialParam();
            if (paramToLoad.length === initialParam.length) {
                // this is a tutorial, so we need to set the view box to the default
                dispatch(setSvgViewBoxMin({ x: -10, y: -13 }));
                // these magic k and b comes from linear equation fitting where you record several window size...
                const newSvgViewBoxZoom = Math.max(0, Math.min(400, -0.132 * height + 117.772));
                dispatch(setSvgViewBoxZoom(newSvgViewBoxZoom));
                await dispatch(pullServerImages());
                rmgRuntime.event(Events.LOAD_TUTORIAL, {});
            }
        }
        onConfirmClose();
        setParamToLoad(null);
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        logger.debug('OpenActions.handleUpload():: received file', file);

        if (file?.type !== 'application/json') {
            dispatch(
                setGlobalAlert({
                    id: GlobalAlertId.OpenInvalidFileType,
                    status: 'error',
                    message: t('header.open.invalidType'),
                })
            );
            logger.error('OpenActions.handleUpload():: Invalid file type! Only file in JSON format is accepted.');
        } else {
            try {
                const paramStr = await readFileAsText(file);
                setParamToLoad(paramStr);
                const version = parseVersionFromSave(paramStr);
                setVersionToLoad(version);
                onConfirmOpen();
            } catch (err) {
                dispatch(
                    setGlobalAlert({
                        id: GlobalAlertId.OpenFileFailed,
                        status: 'error',
                        message: t('header.open.unknownError'),
                    })
                );
                logger.error(
                    'OpenActions.handleUpload():: Unknown error occurred while parsing the uploaded file',
                    err
                );
            }
        }

        // clear field for next upload
        event.target.value = '';
    };

    const handleLoadTutorial = async () => {
        const initialParam = await getInitialParam();
        setParamToLoad(initialParam);
        setVersionToLoad(parseVersionFromSave(initialParam));
        onConfirmOpen();
    };

    React.useEffect(() => {
        // Note that this function will capture all the states if they're used on first mount,
        // which will prevent code from getting the lasted state changes.
        // Move event listener of broadcast channel to init and use store.getState() and
        // store.dispatch() for correctly handling this case.
        const rmtSaveHandler = async (ev: MessageEvent<SaveManagerEvent>) => {
            const { type, key, from } = ev.data;
            if (type === SaveManagerEventType.SAVE_CHANGED && key === LocalStorageKey.PARAM && from === 'rmt') {
                logger.debug(`Received save changed event on key: ${key}`);
                const param = localStorage.getItem(LocalStorageKey.PARAM);
                if (!param) return;
                await loadParam(param);
            }
        };
        saveManagerChannel.addEventListener('message', rmtSaveHandler);

        // this should never get unmount, but added for safety
        return () => saveManagerChannel.removeEventListener('message', rmtSaveHandler);
    }, []);

    return (
        <>
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

                    <MenuItem icon={<MdOpenInNew />} onClick={() => setIsOpenGallery(true)}>
                        {t('header.open.gallery')}
                        <Badge ml="1" colorScheme="green">
                            New
                        </Badge>
                    </MenuItem>

                    <MenuItem icon={<MdOpenInNew />} onClick={() => setIsOpenAarc(true)}>
                        {t('header.open.otherPlatform.title')}
                        <Badge ml="1" colorScheme="green">
                            New
                        </Badge>
                    </MenuItem>

                    <MenuItem icon={<MdSchool />} onClick={handleLoadTutorial}>
                        {t('header.open.tutorial')}
                    </MenuItem>
                </MenuList>

                <RmgParamAppClip isOpen={isRmgParamAppClipOpen} onClose={() => setIsRmgParamAppClipOpen(false)} />
                <RmpGalleryAppClip isOpen={isOpenGallery} onClose={() => setIsOpenGallery(false)} />
                <ImportFromAarc isOpen={isOpenAarc} onClose={() => setIsOpenAarc(false)} />
            </Menu>

            <ConfirmOverwriteDialog
                isOpen={isConfirmOpen}
                onClose={onConfirmClose}
                onConfirm={handleConfirmLoad}
                saveVersion={versionToLoad}
            />
        </>
    );
}

const readFileAsText = (file: File) => {
    return new Promise((resolve: (text: string) => void) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsText(file);
    });
};
