import React from 'react';
import { nanoid } from 'nanoid';
import { IconButton, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { MdUpload } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { MultiDirectedGraph } from 'graphology';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setRefresh } from '../../redux/runtime/runtime-slice';
import { saveGraph } from '../../redux/app/app-slice';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../../constants/constants';
import { StationAttributes, StationType } from '../../constants/stations';
import { LineType } from '../../constants/lines';
import stations from '../station/stations';
import lines from '../line/lines';
import { ShmetroBasic2020StationAttributes } from '../station/shmetro-basic-2020';

export default function OpenActions() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const graph = React.useRef(window.graph);
    const fileRMGInputRef = React.useRef<HTMLInputElement | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleUploadRMG = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        console.log('OpenActions.handleUploadRMG():: received file', file);

        if (file?.type !== 'application/json') {
            // dispatch(setGlobalAlert({ status: 'error', message: t('OpenActions.invalidType') }));
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
                                // @ts-ignore-error
                                Object.values(StationType).includes(attr.type) &&
                                (attr[attr.type] as StationAttributes).names[0] === (stnInfo as any).name[0]
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
                                    // @ts-ignore-error
                                    Object.values(StationType).includes(attr.type) &&
                                    (attr[attr.type] as StationAttributes).names[0] === (stnInfo as any).name[0]
                            ).length === 0
                    )
                    .forEach(([id, stnInfo], i) => {
                        const type =
                            (stnInfo as any).transfer.info.flat().length > 0
                                ? StationType.ShmetroInt
                                : StationType.ShmetroBasic2020;
                        const attr = { ...stations[type].defaultAttrs, names: (stnInfo as any).name };
                        if (type === StationType.ShmetroBasic2020)
                            (attr as ShmetroBasic2020StationAttributes).color = theme;
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
                                        color: theme,
                                        type: LineType.Diagonal,
                                        [LineType.Diagonal]: lines[LineType.Diagonal].defaultAttrs,
                                        reconcileId: '',
                                    }
                                );
                            });
                    });

                dispatch(setRefresh());
                dispatch(saveGraph(JSON.stringify(graph.current.export())));
            } catch (err) {
                // dispatch(setGlobalAlert({ status: 'error', message: t('OpenActions.unknownError') }));
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
            // dispatch(setGlobalAlert({ status: 'error', message: t('OpenActions.invalidType') }));
            console.error('OpenActions.handleUpload():: Invalid file type! Only file in JSON format is accepted.');
        } else {
            try {
                const paramStr = await readFileAsText(file);
                graph.current = new MultiDirectedGraph() as MultiDirectedGraph<
                    NodeAttributes,
                    EdgeAttributes,
                    GraphAttributes
                >;
                graph.current.import(JSON.parse(paramStr));

                dispatch(setRefresh());
                dispatch(saveGraph(JSON.stringify(graph.current.export())));
            } catch (err) {
                // dispatch(setGlobalAlert({ status: 'error', message: t('OpenActions.unknownError') }));
                console.error(
                    'OpenActions.handleUpload():: Unknown error occurred while parsing the uploaded file',
                    err
                );
            }
        }

        // clear field for next upload
        event.target.value = '';
    };

    return (
        <Menu>
            <MenuButton as={IconButton} size="sm" variant="ghost" icon={<MdUpload />} />
            <MenuList>
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
