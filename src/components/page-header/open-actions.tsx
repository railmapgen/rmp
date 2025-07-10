import { Badge, IconButton, Menu, MenuButton, MenuItem, MenuList, useDisclosure } from '@chakra-ui/react';
import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdInsertDriveFile, MdNoteAdd, MdOpenInNew, MdSchool, MdUpload } from 'react-icons/md';
import { Events, LocalStorageKey } from '../../constants/constants';
import { useRootDispatch } from '../../redux';
import { saveGraph, setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { clearSelected, refreshEdgesThunk, refreshNodesThunk, setGlobalAlert } from '../../redux/runtime/runtime-slice';
import { getCanvasSize } from '../../util/helpers';
import { useWindowSize } from '../../util/hooks';
import { saveManagerChannel, SaveManagerEvent, SaveManagerEventType } from '../../util/rmt-save';
import { getInitialParam, RMPSave, upgrade } from '../../util/save';
import ConfirmOverwriteDialog from './confirm-overwrite-dialog';
import RmgParamAppClip from './rmg-param-app-clip';
import RmpGalleryAppClip from './rmp-gallery-app-clip';

export default function OpenActions() {
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
    const [paramToLoad, setParamToLoad] = React.useState<string | null>(null);

    const size = useWindowSize();
    const { height } = getCanvasSize(size);

    const graph = React.useRef(window.graph);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [isRmgParamAppClipOpen, setIsRmgParamAppClipOpen] = React.useState(false);
    const [isOpenGallery, setIsOpenGallery] = React.useState(false);

    const refreshAndSave = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch, refreshNodesThunk, refreshEdgesThunk, saveGraph, graph]);

    const handleNew = () => {
        dispatch(clearSelected());
        graph.current.clear();
        dispatch(setSvgViewBoxZoom(100));
        dispatch(setSvgViewBoxMin({ x: 0, y: 0 }));
        refreshAndSave();
    };

    const loadParam = async (paramStr: string) => {
        // templates may be obsolete and require upgrades
        const { version, ...save } = JSON.parse(await upgrade(paramStr)) as RMPSave;

        // details panel will complain about unknown nodes or edges if the last selected is not cleared
        dispatch(clearSelected());

        // reset graph with new data
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
                rmgRuntime.event(Events.LOAD_TUTORIAL, {});
            }
        }
        onConfirmClose();
        setParamToLoad(null);
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        console.log('OpenActions.handleUpload():: received file', file);

        if (file?.type !== 'application/json') {
            dispatch(setGlobalAlert({ status: 'error', message: t('header.open.invalidType') }));
            console.error('OpenActions.handleUpload():: Invalid file type! Only file in JSON format is accepted.');
        } else {
            try {
                const paramStr = await readFileAsText(file);
                setParamToLoad(paramStr);
                onConfirmOpen();
            } catch (err) {
                dispatch(setGlobalAlert({ status: 'error', message: t('header.open.unknownError') }));
                console.error(
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

                    <MenuItem icon={<MdSchool />} onClick={handleLoadTutorial}>
                        {t('header.open.tutorial')}
                    </MenuItem>
                </MenuList>

                <RmgParamAppClip isOpen={isRmgParamAppClipOpen} onClose={() => setIsRmgParamAppClipOpen(false)} />
                <RmpGalleryAppClip isOpen={isOpenGallery} onClose={() => setIsOpenGallery(false)} />
            </Menu>

            <ConfirmOverwriteDialog isOpen={isConfirmOpen} onClose={onConfirmClose} onConfirm={handleConfirmLoad} />
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
