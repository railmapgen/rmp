import { nanoid } from 'nanoid';
import { StationAttributes, StationType } from '../constants/stations';
import Graph from 'graphology';
import { GzmtrBasicStationAttributes } from '../components/svgs/stations/gzmtr-basic';
import { ShmetroBasic2020StationAttributes } from '../components/svgs/stations/shmetro-basic-2020';
import { InterchangeInfo } from '../components/panels/details/interchange-field';
import stations from '../components/svgs/stations/stations';
import { GzmtrIntStationAttributes } from '../components/svgs/stations/gzmtr-int';
import { MTRStationAttributes } from '../components/svgs/stations/mtr';
import { LinePathType, LineStyleType } from '../constants/lines';
import { linePaths } from '../components/svgs/lines/lines';

export const parseRmgParam = (graph: Graph, param: Record<string, any>) => {
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
            const nodes = graph.filterNodes(
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
                graph.filterNodes(
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
            } else if (param.style === 'gzmtr') {
                if ((stnInfo as any).transfer.info.flat().length > 0) type = StationType.GzmtrInt;
                else type = StationType.GzmtrBasic;
            } else if (param.style === 'mtr') {
                type = StationType.MTR;
            }

            // read default attrs
            const attr = {
                // deep copy to prevent mutual reference
                ...JSON.parse(JSON.stringify(stations[type].defaultAttrs)),
                names: (stnInfo as any).name,
            };

            // add style specific attrs from RMG save
            if (type === StationType.ShmetroBasic2020) (attr as ShmetroBasic2020StationAttributes).color = theme;
            else if (type === StationType.GzmtrBasic) {
                (attr as GzmtrBasicStationAttributes).color = param.theme;
                (attr as GzmtrBasicStationAttributes).lineCode = param.line_num;
                (attr as GzmtrBasicStationAttributes).stationCode = (stnInfo as any).num;
            } else if (type === StationType.GzmtrInt) {
                const transfer = JSON.parse(JSON.stringify((stnInfo as any).transfer.info)) as InterchangeInfo[][];
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
            } else if (type === StationType.MTR) {
                let transfer = JSON.parse(JSON.stringify((stnInfo as any).transfer.info)) as InterchangeInfo[][];
                // drop out of station transfer as they should be placed in another station
                transfer = [transfer[0]];
                // override line code and station code to empty as they are useless in MTR station
                transfer.forEach(level =>
                    level.forEach(transferInfo => {
                        transferInfo[4] = '';
                        transferInfo[5] = '';
                    })
                );
                if (transfer.flat().length > 0) {
                    // add current theme to transfer[0][0] as MTR display all transfers including the current line
                    transfer[0].unshift([...param.theme, '', ''] as unknown as InterchangeInfo);
                }
                (attr as MTRStationAttributes).transfer = transfer;
            }

            graph.addNode(stnIdMap[id], {
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
                    graph.addDirectedEdgeWithKey(`line_${nanoid(10)}`, stnIdMap[id], stnIdMap[child], {
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
                    });
                });
        });
};
