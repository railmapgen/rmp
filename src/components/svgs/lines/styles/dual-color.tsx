import React from 'react';
import { Bezier } from 'bezier-js';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';
import { Theme } from '../../../../constants/constants';

/**
 * This helper function find the 4th vertex of a parallelogram.
 *   D---C
 *  /   /
 * A---B
 * @returns The coordinates of point D.
 */
const find4thVertexOfAParallelogram = (xa: number, xb: number, xc: number, ya: number, yb: number, yc: number) => {
    const [xmid, ymid] = [xa + xc, ya + yc];
    const [xd, yd] = [xmid - xb, ymid - yb];
    return [xd, yd];
};

const DualColor = (props: LineStyleComponentProps<DualColorAttributes>) => {
    const { id, path, styleAttrs, handleClick } = props;
    const { colorA = defaultDualColorAttributes.colorA, colorB = defaultDualColorAttributes.colorB } =
        styleAttrs ?? defaultDualColorAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    const [pathA, setPathA] = React.useState(path);
    const [pathB, setPathB] = React.useState(path);
    React.useEffect(() => {
        // Note this is not reconcile ready meaning it only handles short path.
        // Find the start point of the Bezier curve.
        const l = path
            .match(/L\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+/)
            ?.at(0)
            ?.replace(/L\s*/, '')
            .split(' ')
            .map(n => Number(n));
        // Find the end point and control points of the Bezier curve.
        const c = path
            .match(
                /C\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+/g
            )
            ?.at(0)
            ?.replace(/C\s*/, '')
            .split(' ')
            .map(n => Number(n));
        if (!l || !c) return;
        // Construct the Bezier curve in bezier-js.
        const b = new Bezier([...l, ...c]);
        // Make the parallel Bezier curves.
        const [cA, cB] = [b.scale(-1.25), b.scale(1.25)];

        // Connect the curve with the first half of the linear line.
        // Find the start point of the original path.
        const m = path
            .match(/M\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+/)
            ?.at(0)
            ?.replace(/M\s*/, '')
            .split(' ')
            .map(n => Number(n));
        // Find the start point of the new curve path.
        const cStartingA = [cA.points.at(0)!.x, cA.points.at(0)!.y];
        // Find the start point of the new curve path.
        const cStartingB = [cB.points.at(0)!.x, cB.points.at(0)!.y];
        if (!m) return;
        // Get the start point of the new path.
        const [mxA, myA] = find4thVertexOfAParallelogram(m[0], l[0], cStartingA[0], m[1], l[1], cStartingA[1]);
        const [mxB, myB] = find4thVertexOfAParallelogram(m[0], l[0], cStartingB[0], m[1], l[1], cStartingB[1]);

        // Connect the curve with the second half of the linear line.
        // Find the end point of the original path.
        const end = path
            .match(/L\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+\s*$/)
            ?.at(0)
            ?.replace(/L\s*/, '')
            .split(' ')
            .map(n => Number(n));
        // Find the end point of the new curve path.
        const cEndingA = [cA.points.at(-1)!.x, cA.points.at(-1)!.y];
        // Find the end point of the new curve path.
        const cEndingB = [cB.points.at(-1)!.x, cB.points.at(-1)!.y];
        // Find the end point of the original curve path.
        const cEnding = [b.points.at(-1)!.x, b.points.at(-1)!.y];
        if (!end) return;
        // Get the end point of the new path.
        const [endXA, endYA] = find4thVertexOfAParallelogram(
            cEndingA[0],
            cEnding[0],
            end[0],
            cEndingA[1],
            cEnding[1],
            end[1]
        );
        const [endXB, endYB] = find4thVertexOfAParallelogram(
            cEndingB[0],
            cEnding[0],
            end[0],
            cEndingB[1],
            cEnding[1],
            end[1]
        );

        setPathA(`M ${mxA},${myA} ${cA.toSVG().replace('M', 'L')} L ${endXA},${endYA}`);
        setPathB(`M ${mxB},${myB} ${cB.toSVG().replace('M', 'L')} L ${endXB},${endYB}`);
    }, [path]);

    return (
        <g id={id}>
            <path d={pathA} fill="none" stroke={colorA[2]} strokeWidth="2.5" strokeLinecap="round" />
            <path d={pathB} fill="none" stroke={colorB[2]} strokeWidth="2.5" strokeLinecap="round" />
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeOpacity="0"
                strokeWidth="5"
                strokeLinecap="round"
                onClick={onClick}
            />
        </g>
    );
};

/**
 * DualColor specific props.
 */
export interface DualColorAttributes extends LinePathAttributes {
    colorA: Theme;
    colorB: Theme;
}

const defaultDualColorAttributes: DualColorAttributes = {
    colorA: [CityCode.Shanghai, 'maglevA', '#0E7572', MonoColour.white],
    colorB: [CityCode.Shanghai, 'maglevB', '#ED6E01', MonoColour.white],
};

const dualColor: LineStyle<DualColorAttributes> = {
    component: DualColor,
    defaultAttrs: defaultDualColorAttributes,
    fields: [],
    metadata: {
        displayName: 'panel.details.line.dualColor.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular],
    },
};

export default dualColor;
