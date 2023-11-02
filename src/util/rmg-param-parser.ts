import Graph from 'graphology';
import { nanoid } from 'nanoid';
import { InterchangeInfo } from '../components/panels/details/interchange-field';
import { linePaths } from '../components/svgs/lines/lines';
import { GzmtrBasicStationAttributes } from '../components/svgs/stations/gzmtr-basic';
import { GzmtrIntStationAttributes } from '../components/svgs/stations/gzmtr-int';
import { MTRStationAttributes } from '../components/svgs/stations/mtr';
import { ShmetroBasic2020StationAttributes } from '../components/svgs/stations/shmetro-basic-2020';
import stations from '../components/svgs/stations/stations';
import { Theme } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { PanelTypeShmetro, RMGParam, RmgStyle } from '../constants/rmg';
import { StationAttributes, StationType } from '../constants/stations';

export const parseRmgParam = (
    graph: Graph,
    { info_panel_type, line_num, stn_list: stnList, style, theme }: RMGParam
) => {
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
                    Object.values(StationType).includes(attr.type) &&
                    (attr[attr.type] as StationAttributes).names[0] === stnInfo.name[0]
            );
            if (nodes.length !== 0) stnIdMap[id] = nodes[0];
        });

    // only import stations that does not exist in the graph, filter by name[0]
    Object.entries(stnList)
        .filter(([id, _]) => !['linestart', 'lineend'].includes(id))
        .filter(
            ([id, stnInfo]) =>
                graph.filterNodes(
                    (node, attr) =>
                        Object.values(StationType).includes(attr.type) &&
                        (attr[attr.type] as StationAttributes).names[0] === stnInfo.name[0]
                ).length === 0
        )
        .forEach(([id, stnInfo], i) => {
            // determine station type
            let type: StationType = StationType.ShmetroBasic;
            const interchangeGroups = stnInfo.transfer.groups;
            const interchangeLines = interchangeGroups.map(group => group.lines).flat();
            if (style === RmgStyle.SHMetro) {
                if (interchangeLines.length > 0) type = StationType.ShmetroInt;
                else if (info_panel_type === PanelTypeShmetro.sh2020) type = StationType.ShmetroBasic2020;
                else type = StationType.ShmetroBasic;
            } else if (style === RmgStyle.GZMTR) {
                if (interchangeLines.length > 0) type = StationType.GzmtrInt;
                else type = StationType.GzmtrBasic;
            } else if (style === RmgStyle.MTR) {
                type = StationType.MTR;
            }

            // read default attrs
            const attr = {
                // deep copy to prevent mutual reference
                ...structuredClone(stations[type].defaultAttrs),
                names: stnInfo.name,
            };

            // add style specific attrs from RMG save
            if (type === StationType.ShmetroBasic2020) (attr as ShmetroBasic2020StationAttributes).color = theme;
            else if (type === StationType.GzmtrBasic) {
                (attr as GzmtrBasicStationAttributes).color = theme;
                (attr as GzmtrBasicStationAttributes).lineCode = line_num;
                (attr as GzmtrBasicStationAttributes).stationCode = stnInfo.num;
            } else if (type === StationType.GzmtrInt) {
                (attr as GzmtrIntStationAttributes).transfer = interchangeGroups.map((group, i) => {
                    // override line code and station code to default as they are not provided in RMG save
                    const interchangeInfos: InterchangeInfo[] =
                        group.lines?.map(line => [...(line.theme ?? (theme as Theme)), '1', '01']) ?? [];
                    // add current line and station code to transfer[0][0]
                    if (i === 0) {
                        return [[...(theme as Theme), line_num, stnInfo.num] as InterchangeInfo, ...interchangeInfos];
                    } else {
                        return interchangeInfos;
                    }
                });
            } else if (type === StationType.MTR) {
                if (interchangeGroups[0].lines?.length) {
                    (attr as MTRStationAttributes).transfer = [
                        [
                            // add current theme to transfer[0][0] as MTR display all transfers including the current line
                            [...(theme as Theme), '', ''],
                            // drop out of station transfer as they should be placed in another station
                            // override line code and station code to empty as they are useless in MTR station
                            ...interchangeGroups[0].lines.map<InterchangeInfo>(line => [
                                ...(line.theme ?? (theme as Theme)),
                                '',
                                '',
                            ]),
                        ],
                    ];
                } else {
                    (attr as MTRStationAttributes).transfer = [[]];
                }
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
            stnInfo.children
                .filter((child: string) => !['linestart', 'lineend'].includes(child))
                .forEach((child: string) => {
                    graph.addDirectedEdgeWithKey(`line_${nanoid(10)}`, stnIdMap[id], stnIdMap[child], {
                        visible: true,
                        zIndex: 0,
                        type: LinePathType.Diagonal,
                        // deep copy to prevent mutual reference
                        [LinePathType.Diagonal]: structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
                        style: LineStyleType.SingleColor,
                        [LineStyleType.SingleColor]: { color: theme },
                        reconcileId: '',
                    });
                });
        });
};
