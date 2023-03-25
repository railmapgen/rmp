import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdInsertDriveFile, MdNoteAdd, MdUpload } from 'react-icons/md';
import { Badge, IconButton, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import { useRootDispatch } from '../../redux';
import {
    ParamState,
    setSvgViewBoxZoom,
    setSvgViewBoxMin,
    saveGraph,
    setFullState,
} from '../../redux/param/param-slice';
import { clearSelected, setRefreshNodes, setRefreshEdges, setGlobalAlert } from '../../redux/runtime/runtime-slice';
import { LinePathType, LineStyleType } from '../../constants/lines';
import { StationAttributes, StationType } from '../../constants/stations';
import { InterchangeInfo } from '../panels/details/interchange-field';
import { linePaths } from '../svgs/lines/lines';
import { GzmtrBasicStationAttributes } from '../svgs/stations/gzmtr-basic';
import { GzmtrIntStationAttributes } from '../svgs/stations/gzmtr-int';
import { ShmetroBasic2020StationAttributes } from '../svgs/stations/shmetro-basic-2020';
import stations from '../svgs/stations/stations';
import { RMPSave, upgrade } from '../../util/save';
import { GalleryModal } from './gallery-modal';

export default function OpenActions() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const graph = React.useRef(window.graph);
    const fileRMGInputRef = React.useRef<HTMLInputElement | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [isGalleryModalOpen, setIsGalleryModalOpen] = React.useState(false);

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

    const handleUploadRMG = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        console.log('OpenActions.handleUploadRMG():: received file', file);

        if (file?.type !== 'application/json') {
            dispatch(setGlobalAlert({ status: 'error', message: t('OpenActions.invalidType') }));
            console.error('OpenActions.handleUploadRMG():: Invalid file type! Only file in JSON format is accepted.');
        } else {
            try {
                const paramStr = await readFileAsText(file);
                const param = JSON.parse(paramStr);
                const stnList = param.stn_list;
                const theme = param.theme;

                // generate stn id
                const stnIdMap = Object.fromEntries(
                    Object.keys(stnList)
                        .filter(id => !['linestart', 'lineend'].includes(id))
                        .map(id => [id, `stn_${nanoid(10)}`])
                );
                // update stnIdMap if stations exist in the graph
                Object.entries(stnList)
                    .filter(([id, _]) => !['linestart', 'lineend'].includes(id))
                    .forEach(([id, stnInfo]) => {
                        const nodes = graph.current.filterNodes(
                            (node, attr) =>
                                // @ts-expect-error
                                Object.values(StationType).includes(attr.type) &&
                                // @ts-expect-error
                                (attr[attr.type] as StationAttributes).names[0] === stnInfo.name[0]
                        );
                        if (nodes.length !== 0) stnIdMap[id] = nodes[0];
                    });

                // only import stations that don't appear in the graph
                Object.entries(stnList)
                    .filter(([id, _]) => !['linestart', 'lineend'].includes(id))
                    .filter(
                        ([id, stnInfo]) =>
                            graph.current.filterNodes(
                                (node, attr) =>
                                    // @ts-expect-error
                                    Object.values(StationType).includes(attr.type) &&
                                    // @ts-expect-error
                                    (attr[attr.type] as StationAttributes).names[0] === stnInfo.name[0]
                            ).length === 0
                    )
                    .forEach(([id, stnInfo], i) => {
                        // determine station type
                        let type: StationType = StationType.ShmetroBasic;
                        if (param.style === 'shmetro') {
                            if ((stnInfo as any).transfer.info.flat().length > 0) type = StationType.ShmetroInt;
                            else if (param.info_panel_type === 'sh2020') type = StationType.ShmetroBasic2020;
                            else type = StationType.ShmetroBasic;
                        } else if (param.style === 'gzmtr' || param.style === 'mtr') {
                            if ((stnInfo as any).transfer.info.flat().length > 0) type = StationType.GzmtrInt;
                            else type = StationType.GzmtrBasic;
                        }

                        // read default attrs
                        const attr = {
                            // deep copy to prevent mutual reference
                            ...JSON.parse(JSON.stringify(stations[type].defaultAttrs)),
                            names: (stnInfo as any).name,
                        };

                        // add style specific attrs from RMG save
                        if (type === StationType.ShmetroBasic2020)
                            (attr as ShmetroBasic2020StationAttributes).color = theme;
                        else if (type === StationType.GzmtrBasic) {
                            (attr as GzmtrBasicStationAttributes).color = param.theme;
                            (attr as GzmtrBasicStationAttributes).lineCode = param.line_num;
                            (attr as GzmtrBasicStationAttributes).stationCode = (stnInfo as any).num;
                        } else if (type === StationType.GzmtrInt) {
                            const transfer = JSON.parse(
                                JSON.stringify((stnInfo as any).transfer.info)
                            ) as InterchangeInfo[][];
                            // override line code and station code to default as they are not provided in RMG save
                            transfer.forEach(lv1 =>
                                lv1.forEach(transferInfo => {
                                    transferInfo[4] = '1';
                                    transferInfo[5] = '01';
                                })
                            );
                            // add current line and station code to transfer[0][0]
                            transfer[0].unshift([
                                ...param.theme,
                                param.line_num,
                                (stnInfo as any).num,
                            ] as unknown as InterchangeInfo);
                            (attr as GzmtrIntStationAttributes).transfer = transfer;
                        }

                        graph.current.addNode(stnIdMap[id], {
                            visible: true,
                            zIndex: 0,
                            x: 100 + i * 50,
                            y: 1000,
                            type,
                            [type]: attr,
                        });
                    });

                // import lines
                Object.entries(stnList)
                    .filter(([id, _]) => !['linestart', 'lineend'].includes(id))
                    .forEach(([id, stnInfo]) => {
                        (stnInfo as any).children
                            .filter((child: string) => !['linestart', 'lineend'].includes(child))
                            .forEach((child: string) => {
                                graph.current.addDirectedEdgeWithKey(
                                    `line_${nanoid(10)}`,
                                    stnIdMap[id],
                                    stnIdMap[child],
                                    {
                                        visible: true,
                                        zIndex: 0,
                                        type: LinePathType.Diagonal,
                                        // deep copy to prevent mutual reference
                                        [LinePathType.Diagonal]: JSON.parse(
                                            JSON.stringify(linePaths[LinePathType.Diagonal].defaultAttrs)
                                        ),
                                        style: LineStyleType.SingleColor,
                                        [LineStyleType.SingleColor]: { color: theme },
                                        reconcileId: '',
                                    }
                                );
                            });
                    });

                refreshAndSave();
            } catch (err) {
                dispatch(setGlobalAlert({ status: 'error', message: t('OpenActions.unknownError') }));
                console.error(
                    'OpenActions.handleUploadRMG():: Unknown error occurred while parsing the uploaded file',
                    err
                );
            }
        }

        // clear field for next upload
        event.target.value = '';
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

                // details panel will complain unknown nodes or edges if last state is not cleared
                dispatch(clearSelected());
                graph.current.clear();
                graph.current.import(save.graph);
                const state: ParamState = { ...save, present: save.graph, past: [], future: [] };
                dispatch(setFullState(state));

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

    const handleOpenTemplates = async (rmpSave: RMPSave) => {
        // templates may be obsolete and require upgrades
        const { version, graph: g, ...save } = JSON.parse(await upgrade(JSON.stringify(rmpSave))) as RMPSave;

        // details panel will complain about unknown nodes or edges if the last selected is not cleared
        dispatch(clearSelected());
        graph.current.clear();
        graph.current.import(g);
        const state: ParamState = { ...save, present: g, past: [], future: [] };
        dispatch(setFullState(state));

        refreshAndSave();
    };

    return (
        <Menu>
            <MenuButton as={IconButton} size="sm" variant="ghost" icon={<MdUpload />} />
            <MenuList>
                <MenuItem icon={<MdNoteAdd />} onClick={handleNew}>
                    {t('header.open.new')}
                </MenuItem>

                <input
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

                <input
                    ref={fileRMGInputRef}
                    type="file"
                    accept=".json"
                    hidden={true}
                    onChange={handleUploadRMG}
                    data-testid="file-upload"
                />
                <MenuItem icon={<MdUpload />} onClick={() => fileRMGInputRef?.current?.click()}>
                    {t('header.open.configRMG')}
                </MenuItem>

                <MenuItem icon={<MdInsertDriveFile />} onClick={() => setIsGalleryModalOpen(true)}>
                    {t('header.open.gallery')}
                    <Badge ml="1" colorScheme="green">
                        New
                    </Badge>
                </MenuItem>
                <GalleryModal
                    isOpen={isGalleryModalOpen}
                    handleOpenTemplates={handleOpenTemplates}
                    onClose={() => setIsGalleryModalOpen(false)}
                />
            </MenuList>
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
