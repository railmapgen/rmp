import React from 'react';
import {
    ExternalLinePathAttributes,
    ExternalLineStyleAttributes,
    LinePathType,
    LineStyleComponentProps,
    LineWrapperComponentProps,
} from '../../../constants/lines';
import { UnknownLineStyle } from '../common/unknown';
import { linePaths, lineStyles } from './lines';
import { LineId } from '../../../constants/constants';

const LineWrapper = (props: LineWrapperComponentProps) => {
    const {
        id,
        type,
        attrs = linePaths[type].defaultAttrs as NonNullable<
            ExternalLinePathAttributes[keyof ExternalLinePathAttributes]
        >,
        styleType,
        styleAttrs = lineStyles[styleType].defaultAttrs as NonNullable<
            ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]
        >,
        newLine,
        handleClick,
    } = props;
    const { x1, y1, x2, y2 } = props;

    const path = React.useMemo(
        () => makePath(id, type, x1, y1, x2, y2, attrs),
        [type, (attrs as any)['offsetFrom'], (attrs as any)['offsetTo'], x1, x2, y1, y2]
    );

    // HELP NEEDED: Why component is not this type?
    const StyleComponent = (lineStyles[styleType]?.component ?? UnknownLineStyle) as React.FC<
        LineStyleComponentProps<NonNullable<ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]>>
    >;

    return (
        <StyleComponent
            id={id}
            type={type}
            path={path}
            styleAttrs={styleAttrs}
            newLine={newLine}
            handleClick={handleClick}
        />
    );
};

export default LineWrapper;

const makePath = (
    id: LineId,
    type: LinePathType,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    attrs: NonNullable<ExternalLinePathAttributes[keyof ExternalLinePathAttributes]>
): `${'m' | 'M'}${string}` => {
    if (!(type in linePaths)) {
        // unknown line path type
        return `M ${x1},${y1} L ${x2},${y2}`;
    }

    const simplePathAvailability = checkSimplePathAvailability(id, type, x1, y1, x2, y2, attrs);
    if (simplePathAvailability) {
        // simple path hook on matched situation
        const { x1, y1, x2, y2, offset } = simplePathAvailability;
        return linePaths[LinePathType.Simple].generatePath(x1, x2, y1, y2, { offset });
    }

    // regular line path type, call the corresponding generatePath function
    return linePaths[type].generatePath(x1, x2, y1, y2, attrs as any);
};

/**
 * Automatically use the simple path under these conditions:
 *   1. offsetFrom and offsetTo are defined and are numbers AND
 *   2. Either offsetFrom and offsetTo are equal and the combination of
 *        slope (k) and type is one of the following cases:
 *     2.1 k = 0 or ∞ and type is Diagonal or Perpendicular OR
 *     2.2 k = 1 or -1 and type is Diagonal or RotatePerpendicular
 *   3. Or offsetFrom and offsetTo
 */
const checkSimplePathAvailability = (
    id: LineId,
    type: LinePathType,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    attrs: NonNullable<ExternalLinePathAttributes[keyof ExternalLinePathAttributes]>
): { x1: number; y1: number; x2: number; y2: number; offset: number } | undefined => {
    // Check if offsetFrom and offsetTo are defined and are numbers.
    if (!('offsetFrom' in attrs) || !('offsetTo' in attrs)) return;
    if (Number.isNaN(attrs['offsetFrom']) || Number.isNaN(attrs['offsetTo'])) return;

    // Normal traditional cases where several lines goes from one dot to another.
    if (attrs['offsetFrom'] === attrs['offsetTo']) {
        if (checkKAndType(type, x1, y1, x2, y2)) {
            return { x1, y1, x2, y2, offset: attrs['offsetFrom'] };
        }
        return;
    }

    // Additional complex cases where several lines merge from different origins to one target.
    // Find all possible origins and targets with offset and see if it forms a valid simple path condition.
    // To find, simply generate all 8 possible radian and radius(offset) combination for both origin and target.
    // Note this may find the first valid case which might not be the one desired in some corner case.
    // E.g. dot1(0,0) dot2(10,10) with offsetFrom=10 and offsetTo=0 -> multiple valid origin and
    //      target combination for simple path such as dot1(10,0) dot2(10,10) or dot1(0,10) dot2(10,10).
    //      This should be considered feature instead of bug and suggest user to slightly move the dot.
    const [offset1, offset2] = [attrs['offsetFrom'], attrs['offsetTo']];
    for (let rad1 = 0; rad1 < Math.PI; rad1 += Math.PI / 8) {
        // here is some optimization that only make the target dot in the same or the opposite direction of the origin dot
        for (let rad2 = rad1, i = 0; i < 2; i++, rad2 += Math.PI) {
            const [dx1, dy1, dx2, dy2] = [
                Math.sin(rad1) * offset1,
                Math.cos(rad1) * offset1,
                Math.sin(rad2) * offset2,
                Math.cos(rad2) * offset2,
            ];
            if (checkKAndType(type, x1 + dx1, y1 + dy1, x2 + dx2, y2 + dy2)) {
                // console.log(id, (rad1 * 180) / Math.PI, (rad2 * 180) / Math.PI, x1 + dx1, y1 + dy1, x2 + dx2, y2 + dy2);
                return { x1: x1 + dx1, y1: y1 + dy1, x2: x2 + dx2, y2: y2 + dy2, offset: 0 };
            }
        }
    }
};

/**
 * Check k and type to see if this combination matches the simple path rule for this line path type.
 *   1. k = 0 or ∞(parallel and vertical) for Diagonal and Perpendicular.
 *   2. k = 1 or -1(45°/135°/225°/345°) for Diagonal and RotatePerpendicular.
 *
 * E.g. For the following case, perpendicular instead of simple should be used even if it is a 45°.
 *      *--┐
 *         |
 *         |
 *         *
 */
const checkKAndType = (type: LinePathType, x1: number, y1: number, x2: number, y2: number) => {
    if ((x1 === x2 || y1 === y2) && [LinePathType.Diagonal, LinePathType.Perpendicular].includes(type)) return true;
    if (
        Math.abs((y2 - y1) / (x2 - x1)) === 1 &&
        [LinePathType.Diagonal, LinePathType.RotatePerpendicular].includes(type)
    )
        return true;
    return false;
};
