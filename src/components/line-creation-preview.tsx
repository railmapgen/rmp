import React from 'react';
import { EdgeAttributes, getLinePathAndStyle, NodeId } from '../constants/constants';
import { LinePathAttributes, LinePathDrawingSession, LinePathType, LineStyleType } from '../constants/lines';
import { Path, PathPoint } from '../constants/path';
import { useRootSelector } from '../redux';
import { linePaths, lineStyles } from './svgs/lines/lines';
import { initializeBezierEndpointOffsets } from './svgs/lines/paths/bezier-endpoint';

export interface LineDrawingGesture {
    type: LinePathType;
    source: NodeId;
    sourcePoint: PathPoint;
    pointer: PathPoint;
    target?: NodeId;
    session?: LinePathDrawingSession<LinePathAttributes>;
}

interface LineCreationPreviewProps {
    pointerOffset: { dx: number; dy: number };
    gesture?: LineDrawingGesture;
}

const ignorePointerDown = () => {};

export const LineCreationPreview = (props: LineCreationPreviewProps) => {
    const { pointerOffset, gesture } = props;
    const mode = useRootSelector(state => state.runtime.mode);
    const theme = useRootSelector(state => state.runtime.theme);
    const source = useRootSelector(state => state.runtime.active);
    const { path: linePath, style: lineStyle } = getLinePathAndStyle(mode);
    const lineStyleAttrs = React.useMemo(() => {
        if (!lineStyle) return;
        const attrs = structuredClone(lineStyles[lineStyle].defaultAttrs);
        // TODO: there should be some way for a style to disable auto theme injection
        if ('color' in attrs && lineStyle !== LineStyleType.River) attrs.color = theme;
        return attrs;
    }, [lineStyle, theme]);

    const graph = window.graph;
    if (
        !linePath ||
        !lineStyle ||
        !lineStyleAttrs ||
        !source ||
        source === 'background' ||
        (gesture && gesture.type !== linePath) ||
        !graph.hasNode(source)
    ) {
        return null;
    }

    const LineStyleComponent = lineStyles[lineStyle].component;
    const sourcePoint = {
        x: graph.getNodeAttribute(source, 'x'),
        y: graph.getNodeAttribute(source, 'y'),
    };
    const pointerPoint = {
        x: sourcePoint.x - pointerOffset.dx,
        y: sourcePoint.y - pointerOffset.dy,
    };
    const targetPoint =
        gesture?.target && graph.hasNode(gesture.target)
            ? {
                  x: graph.getNodeAttribute(gesture.target, 'x'),
                  y: graph.getNodeAttribute(gesture.target, 'y'),
              }
            : pointerPoint;

    let previewPath: Path | undefined;
    if (gesture?.session) {
        previewPath = gesture.session.getPreviewPath(gesture.pointer);
    } else if (!linePaths[linePath].drawingBehavior) {
        const previewEdgeAttrs = {
            visible: true,
            zIndex: 0,
            type: linePath,
            [linePath]: structuredClone(linePaths[linePath].defaultAttrs),
            style: lineStyle,
            [lineStyle]: lineStyleAttrs,
            reconcileId: '',
            parallelIndex: -1,
        } as EdgeAttributes;
        if (linePath === LinePathType.Bezier && gesture?.type === LinePathType.Bezier) {
            previewEdgeAttrs[LinePathType.Bezier] = initializeBezierEndpointOffsets(
                graph,
                gesture.source,
                gesture.target,
                previewEdgeAttrs
            );
        }

        previewPath = linePaths[linePath].generatePath(
            sourcePoint.x,
            targetPoint.x,
            sourcePoint.y,
            targetPoint.y,
            // @ts-expect-error path and attrs share the same registry key
            previewEdgeAttrs[linePath]
        );
    }

    if (!previewPath) return null;

    const preview = (
        <LineStyleComponent
            id="line_create_in_progress___no_use"
            type={linePath}
            path={previewPath}
            // @ts-expect-error line style attributes are selected from the same registry key.
            styleAttrs={lineStyleAttrs}
            newLine
            handlePointerDown={ignorePointerDown}
        />
    );
    return gesture?.session ? <g opacity={0.65}>{preview}</g> : preview;
};
