import type { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { LinePathType } from '../constants/lines';
import type { OpenPath, Path } from '../constants/path';
import { graphToWorldPixel, MAP_COMMON_ZOOM, MAP_TILE_SIZE } from '../map/map-config';
import { linePaths } from '../components/svgs/lines/lines';
import { getOpenPathLength } from './open-path-length';
import { distanceBetweenPoints } from './geometry';

// Web Mercator 世界像素空间的几何常量。编辑器图坐标通过 `graphToWorldPixel` 进入该空间，
// 里程换算依赖该空间与实际地理距离的对应关系。
const EARTH_CIRCUMFERENCE_METERS = 40_075_016.686;
const WORLD_SIZE = MAP_TILE_SIZE * 2 ** MAP_COMMON_ZOOM;

const OPEN_PATH_KINDS = new Set(['ml', 'mc', 'mll', 'mlcl', 'complex-open']);

const isOpenPath = (path: Path): path is OpenPath => OPEN_PATH_KINDS.has(path.kind);

// 通过世界像素 y 反推纬度，用于按纬度修正 Web Mercator 在东西方向的尺度比例。
const latitudeFromWorldPixelY = (y: number) => {
    const normalizedY = y / WORLD_SIZE;
    return (Math.atan(Math.sinh(Math.PI * (1 - 2 * normalizedY))) * 180) / Math.PI;
};

/**
 * 计算一条边在地图上的实际里程长度（公里）。
 *
 * 仅在真实地图与动画时间线同时启用时调用；任一关闭时调用方应回退到原默认里程逻辑（1 公里）。
 * 长度先在图坐标系下按路径几何精确测量，再按端点中点纬度修正后的 Web Mercator 比例换算为米。
 */
export const getEdgeMileageInKilometers = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edge: LineId
): number => {
    const [source, target] = graph.extremities(edge) as [NodeId, NodeId];
    const sourcePoint = {
        x: graph.getNodeAttribute(source, 'x'),
        y: graph.getNodeAttribute(source, 'y'),
    };
    const targetPoint = {
        x: graph.getNodeAttribute(target, 'x'),
        y: graph.getNodeAttribute(target, 'y'),
    };
    const type = graph.getEdgeAttribute(edge, 'type') as LinePathType;
    // graphology 返回的属性是各路径属性类型的联合；generatePath 期望具体路径的属性，这里按 any 透传以避免联合转交集的类型摩擦。
    const attrs = graph.getEdgeAttribute(edge, type) as any;
    const path = linePaths[type].generatePath(sourcePoint.x, targetPoint.x, sourcePoint.y, targetPoint.y, attrs);
    // 退化为空或闭合几何时无法按弧长测量，回退到端点直线距离，保持调用方总能拿到一个有限正值。
    const lengthInGraphUnits = isOpenPath(path)
        ? getOpenPathLength(path)
        : distanceBetweenPoints(sourcePoint, targetPoint);
    const sourceWorld = graphToWorldPixel(sourcePoint);
    const targetWorld = graphToWorldPixel(targetPoint);
    const latitude = latitudeFromWorldPixelY((sourceWorld.y + targetWorld.y) / 2);
    // Web Mercator 在赤道处 1 世界像素等于 赤道周长/世界像素总宽 米；该投影为正形，局部尺度因子为 sec(纬度)，
    // 故每图形单位对应的地面米数随纬度按 cos(纬度) 收缩。
    const metersPerGraphUnit =
        (EARTH_CIRCUMFERENCE_METERS / WORLD_SIZE) * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
    return Number(Math.max((lengthInGraphUnits * metersPerGraphUnit) / 1000, 0).toFixed(1));
};
