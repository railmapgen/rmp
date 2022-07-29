import React from 'react';
import { nanoid } from 'nanoid';
import { IconButton, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { MdUpload } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setRefresh } from '../../redux/runtime/runtime-slice';
import { saveGraph } from '../../redux/app/app-slice';
import { StationType } from '../../constants/stations';
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
        console.log('OpenActions.handleUpload():: received file', file);

        if (file?.type !== 'application/json') {
            // dispatch(setGlobalAlert({ status: 'error', message: t('OpenActions.invalidType') }));
            console.error('OpenActions.handleUpload():: Invalid file type! Only file in JSON format is accepted.');
        } else {
            try {
                const paramStr = await readFileAsText(file);
                const param = JSON.parse(paramStr);
                const stnList = param.stn_list;
                const theme = param.theme;

                // import stations
                Object.entries(stnList)
                    .filter(([id, _]) => !['linestart', 'lineend'].includes(id))
                    .forEach(([id, stnInfo]) => {
                        const type =
                            (stnInfo as any).transfer.info.flat().length > 0
                                ? StationType.ShmetroInt
                                : StationType.ShmetroBasic2020;
                        const attr = { ...stations[type].defaultAttrs, names: (stnInfo as any).name };
                        if (type === StationType.ShmetroBasic2020)
                            (attr as ShmetroBasic2020StationAttributes).color = theme;
                        graph.current.addNode(`stn_${id}`, {
                            visible: true,
                            zIndex: 0,
                            x: 100,
                            y: 100,
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
                                    `stn_${id}`,
                                    `stn_${child}`,
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
                    'OpenActions.handleUpload():: Unknown error occurred while parsing the uploaded file',
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
                    ref={fileRMGInputRef}
                    type="file"
                    accept=".json"
                    hidden={true}
                    onChange={handleUploadRMG}
                    data-testid="file-upload"
                />
                <MenuItem icon={<MdUpload />} onClick={() => fileInputRef?.current?.click()}>
                    {t('header.open.config')}
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
