import { SnapPoint } from '../constants/canvas';
import { useRootSelector } from '../redux';

interface SnapPointGuideLinesProps {
    activeSnapPoint: SnapPoint;
}

const SnapPointGuideLines = (props: SnapPointGuideLinesProps) => {
    const { activeSnapPoint } = props;
    const { svgViewBoxZoom } = useRootSelector(state => state.param);
    const getSnapPointGuideLineProps = (snap: SnapPoint) => {
        const coords = [{ x: snap.x, y: snap.y }, ...snap.originalNodesPos];
        const sortedCoords = coords.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
        const k = (sortedCoords[1].y - sortedCoords[0].y) / (sortedCoords[1].x - sortedCoords[0].x);
        if (Math.abs(k) <= 0.01) {
            return {
                original: sortedCoords,
                offset: sortedCoords.map(p => ({ x: p.x, y: p.y + 10 })),
                rotate: 0,
            };
        } else if (Math.abs(k) >= 10e9) {
            return {
                original: sortedCoords,
                offset: sortedCoords.map(p => ({ x: p.x + 10, y: p.y })),
                rotate: 90,
            };
        } else {
            const offset = 10;
            const kk = -1 / k;
            const dx = offset / Math.sqrt(kk * kk + 1);
            const dy = (offset * kk) / Math.sqrt(kk * kk + 1);
            return {
                original: sortedCoords,
                offset: sortedCoords.map(p => ({ x: p.x + dx, y: p.y + dy })),
                rotate: -Math.atan(kk) * (180 / Math.PI),
            };
        }
    };

    const { original, offset, rotate } = getSnapPointGuideLineProps(activeSnapPoint);

    const getEquilateralTrianglePoints = (a: number): string => {
        const height = (Math.sqrt(3) / 2) * a;
        const top = `0,0`;
        const left = `${-a / 2},${height}`;
        const right = `${a / 2},${height}`;
        return `${top} ${left} ${right}`;
    };

    const width = svgViewBoxZoom / 75;
    const triangleSize = 8 * width;
    const color = '#FC8181';
    const dasharray = `${width * 5} ${width * 2}`;

    return (
        <>
            <line
                x1={offset[0].x}
                y1={offset[0].y}
                x2={offset[1].x}
                y2={offset[1].y}
                stroke={color}
                strokeWidth={width}
                strokeDasharray={dasharray}
            />
            <line
                x1={offset[1].x}
                y1={offset[1].y}
                x2={offset[2].x}
                y2={offset[2].y}
                stroke={color}
                strokeWidth={width}
                strokeDasharray={dasharray}
            />
            <line
                x1={original[0].x}
                y1={original[0].y}
                x2={offset[0].x}
                y2={offset[0].y}
                stroke={color}
                strokeWidth={width}
                strokeDasharray={dasharray}
            />
            <line
                x1={original[1].x}
                y1={original[1].y}
                x2={offset[1].x}
                y2={offset[1].y}
                stroke={color}
                strokeWidth={width}
                strokeDasharray={dasharray}
            />
            <line
                x1={original[2].x}
                y1={original[2].y}
                x2={offset[2].x}
                y2={offset[2].y}
                stroke={color}
                strokeWidth={width}
                strokeDasharray={dasharray}
            />
            <polygon
                points={getEquilateralTrianglePoints(triangleSize)}
                transform={`translate(${offset[0].x},${offset[0].y}) rotate(${(rotate + 270) % 360})`}
                fill={color}
            />
            <polygon
                points={getEquilateralTrianglePoints(triangleSize)}
                transform={`translate(${offset[1].x},${offset[1].y}) rotate(${(rotate + 270) % 360})`}
                fill={color}
            />
            <polygon
                points={getEquilateralTrianglePoints(triangleSize)}
                transform={`translate(${offset[1].x},${offset[1].y}) rotate(${(rotate + 90) % 360})`}
                fill={color}
            />
            <polygon
                points={getEquilateralTrianglePoints(triangleSize)}
                transform={`translate(${offset[2].x},${offset[2].y}) rotate(${(rotate + 90) % 360})`}
                fill={color}
            />
        </>
    );
};

export default SnapPointGuideLines;
