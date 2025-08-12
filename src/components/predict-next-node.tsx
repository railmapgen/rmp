import rmgRuntime from '@railmapgen/rmg-runtime';
import { nanoid } from 'nanoid';
import { Events, LineId, MiscNodeId, StationCity, StnId, Theme } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationAttributes, StationType } from '../constants/stations';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk, setSelected } from '../redux/runtime/runtime-slice';
import { makeParallelIndex } from '../util/parallel';
import { getOneStationName } from '../util/random-station-names';
import { AttributesWithColor, dynamicColorInjection } from './panels/details/color-field';
import { linePaths } from './svgs/lines/lines';
import diagonalPath from './svgs/lines/paths/diagonal';
import singleColor from './svgs/lines/styles/single-color';
import miscNodes from './svgs/nodes/misc-nodes';
import virtual from './svgs/nodes/virtual';
import stations from './svgs/stations/stations';

const VirtualNodeComponent = virtual.component;
const diagonalPathGenerator = diagonalPath.generatePath;
const SingleColorComponent = singleColor.component;

const PredictNextNode = () => {
    const dispatch = useRootDispatch();
    const refreshAndSave = () => {
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    };
    const { activeSubscriptions } = useRootSelector(state => state.account);
    const {
        telemetry: { project: isAllowProjectTelemetry },
        preference: { autoParallel, randomStationsNames },
    } = useRootSelector(state => state.app);
    const { selected, theme: runtimeTheme } = useRootSelector(state => state.runtime);

    const isRandomStationNamesDisabled = !activeSubscriptions.RMP_CLOUD || randomStationsNames === 'none';

    if (selected.size !== 1) return undefined;
    const selectedID = selected.keys().next().value!;
    if (!selectedID.startsWith('stn') && !selectedID.startsWith('misc_node')) return undefined;

    const neighbors = window.graph.neighbors(selectedID);
    if (neighbors.length === 0) return undefined;

    const curPos = window.graph.getNodeAttributes(selectedID);
    const sumPos = neighbors.reduce(
        (acc, id) => {
            const attr = window.graph.getNodeAttributes(id);
            return {
                x: acc.x + attr.x,
                y: acc.y + attr.y,
            };
        },
        { x: 0, y: 0 }
    );
    const avgPos = {
        x: sumPos.x / neighbors.length,
        y: sumPos.y / neighbors.length,
    };
    const nextPos = {
        x: curPos.x + (curPos.x - avgPos.x),
        y: curPos.y + (curPos.y - avgPos.y),
    };

    const allThemes = window.graph.reduceEdges(
        selectedID,
        (acc, edge) => {
            const attr = window.graph.getEdgeAttributes(edge);
            const { style } = attr;
            if (style === LineStyleType.SingleColor) {
                const theme = JSON.stringify(attr[style]!.color);
                if (theme in acc) {
                    acc[theme] += 1;
                } else {
                    acc[theme] = 1;
                }
            }
            return acc;
        },
        {} as Record<string, number>
    );
    const mostFrequentTheme =
        Object.entries(allThemes).reduce(
            (max, [theme, count]) => (count > max.count ? { color: JSON.parse(theme) as Theme, count } : max),
            { color: null as Theme | null, count: 0 }
        ).color ?? runtimeTheme;
    const path = diagonalPathGenerator(curPos.x, nextPos.x, curPos.y, nextPos.y, diagonalPath.defaultAttrs);

    const handlePointerDown = async (_: string, e: React.PointerEvent<SVGElement>) => {
        const mode = 'misc-node-virtual'; // TODO: fix this

        const rand = nanoid(10);
        const isStation = mode.startsWith('station');
        const nextID: StnId | MiscNodeId = isStation ? `stn_${rand}` : `misc_node_${rand}`;
        const nodeType = (isStation ? mode.slice(8) : mode.slice(10)) as StationType | MiscNodeType;

        // deep copy to prevent mutual reference
        const attr = structuredClone({ ...stations, ...miscNodes }[nodeType].defaultAttrs);
        // inject runtime color if registered in dynamicColorInjection
        if (dynamicColorInjection.has(nodeType)) (attr as AttributesWithColor).color = runtimeTheme;
        // Add random names for stations
        // TODO: extract this logic to a separate function
        if (isStation && !isRandomStationNamesDisabled) {
            const attrNames = (attr as StationAttributes).names;
            const namesActionResult = await dispatch(getOneStationName(StationCity.Shmetro));
            // only proceed if there is no error returned
            if (getOneStationName.fulfilled.match(namesActionResult)) {
                const names = namesActionResult.payload as [string, ...string[]];
                // fill or truncate the names array to the station name length
                if (attrNames.length > names.length) {
                    names.push(...Array(attrNames.length - names.length).fill(names.at(-1)));
                } else if (attrNames.length < names.length) {
                    names.splice(attrNames.length, names.length - attrNames.length);
                }
                (attr as StationAttributes).names = names;
            }
        }

        window.graph.addNode(nextID, {
            visible: true,
            zIndex: 0,
            x: nextPos.x,
            y: nextPos.y,
            type: nodeType,
            [nodeType]: attr,
        });
        if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_STATION, { type: nodeType });

        const pathType = LinePathType.Diagonal;
        const newLineId: LineId = `line_${nanoid(10)}`;
        const [source, target] = [selectedID as StnId | MiscNodeId, nextID];
        const parallelIndex = autoParallel ? makeParallelIndex(window.graph, pathType, source, target, 'from') : -1;
        window.graph.addDirectedEdgeWithKey(newLineId, source, target, {
            visible: true,
            zIndex: 0,
            type: pathType,
            // deep copy to prevent mutual reference
            [pathType]: structuredClone(linePaths[pathType].defaultAttrs),
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color: mostFrequentTheme },
            reconcileId: '',
            parallelIndex,
        });
        if (isAllowProjectTelemetry) rmgRuntime.event(Events.ADD_LINE, { type: pathType });

        dispatch(setSelected(new Set([nextID])));
        refreshAndSave();
    };

    return (
        <g id="prediction" opacity="0.5" className="removeMe">
            <VirtualNodeComponent
                id="misc_node_virtual_prediction"
                attrs={{}}
                x={nextPos.x}
                y={nextPos.y}
                handlePointerDown={handlePointerDown}
                handlePointerMove={() => {}}
                handlePointerUp={() => {}}
            />
            <SingleColorComponent
                id="line_prediction"
                type={LinePathType.Diagonal}
                path={path}
                styleAttrs={{ color: mostFrequentTheme }}
                newLine
                handlePointerDown={() => {}}
            />
        </g>
    );
};

export default PredictNextNode;
