import { Badge, IconButton, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdInsertDriveFile, MdNoteAdd, MdOpenInNew, MdSchool, MdUpload } from 'react-icons/md';
import { Events } from '../../constants/constants';
import { RMGParam } from '../../constants/rmg';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph, setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { clearSelected, setGlobalAlert, setRefreshEdges, setRefreshNodes } from '../../redux/runtime/runtime-slice';
import { getCanvasSize } from '../../util/helpers';
import { useWindowSize } from '../../util/hooks';
import { parseRmgParam } from '../../util/rmg-param-parser';
import { getInitialParam, upgrade } from '../../util/save';
import RmgParamAppClip from './rmg-param-app-clip';
import RmpGalleryAppClip from './rmp-gallery-app-clip';

export default function OpenActions() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const {
        telemetry: { project: isAllowAppTelemetry },
    } = useRootSelector(state => state.app);

    const graph = React.useRef(window.graph);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [isRmgParamAppClipOpen, setIsRmgParamAppClipOpen] = React.useState(false);
    const [isOpenGallery, setIsOpenGallery] = React.useState(false);

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

    const handleImportRMGProject = (param: RMGParam) => {
        try {
            if (isAllowAppTelemetry) rmgRuntime.event(Events.IMPORT_RMG_PARAM, {});
            parseRmgParam(graph.current, param);
            refreshAndSave();
        } catch (err) {
            dispatch(setGlobalAlert({ status: 'error', message: t('header.open.unknownError') }));
            console.error('OpenActions.handleUploadRMG():: Unknown error occurred while parsing the RMG project', err);
        } finally {
            setIsRmgParamAppClipOpen(false);
        }
    };

    const loadParam = async (paramStr: string) => {
        const { version, ...save } = JSON.parse(await upgrade(paramStr));

        // details panel will complain about unknown nodes or edges if the last selected is not cleared
        dispatch(clearSelected());

        // rest graph with new data
        graph.current.clear();
        graph.current.import(save.graph);

        refreshAndSave();
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
                await loadParam(paramStr);
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

    const size = useWindowSize();
    const { height } = getCanvasSize(size);

    const handleLoadTutorial = async () => {
        await loadParam(await getInitialParam());
        dispatch(setSvgViewBoxMin({ x: -10, y: -13 }));
        // these magic k and b comes from linear equation fitting where you record several window size...
        const newSvgViewBoxZoom = Math.max(0, Math.min(400, -0.132 * height + 117.772));
        dispatch(setSvgViewBoxZoom(newSvgViewBoxZoom));
    };

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

            <RmgParamAppClip
                isOpen={isRmgParamAppClipOpen}
                onClose={() => setIsRmgParamAppClipOpen(false)}
                onImport={handleImportRMGProject}
            />
            <RmpGalleryAppClip isOpen={isOpenGallery} onClose={() => setIsOpenGallery(false)} />
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
