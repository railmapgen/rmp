import { SnapLine, SnapPoint } from '../constants/canvas';
import { LinePathType } from '../constants/lines';
import { getViewpointSize } from '../util/helpers';
import { makeSnapLinesPath } from '../util/snap-lines';
import SnapPointGuideLines from './snap-point-guide-lines';
import { linePaths } from './svgs/lines/lines';

interface NodeSnapGuidesProps {
    activeSnapLines: SnapLine[];
    activeSnapPoint?: SnapPoint;
    viewport: { x: number; y: number; zoom: number };
    width: number;
    height: number;
}

const NodeSnapGuides = ({ activeSnapLines, activeSnapPoint, viewport, width, height }: NodeSnapGuidesProps) => (
    <>
        {activeSnapLines.map(line => (
            <path
                key={`snap_line_${line.a}_${line.b}_${line.c}_${line.node}`}
                d={
                    linePaths[LinePathType.Simple].generatePath(
                        ...makeSnapLinesPath(line, getViewpointSize(viewport, viewport.zoom, width, height)),
                        linePaths[LinePathType.Simple].defaultAttrs
                    ).d
                }
                stroke="cyan"
                strokeWidth={viewport.zoom / 75}
            />
        ))}
        {activeSnapPoint && <SnapPointGuideLines activeSnapPoint={activeSnapPoint} />}
    </>
);

export default NodeSnapGuides;
