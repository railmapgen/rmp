import { ExternalLinePathAttributes, LinePathType } from '../constants/lines';

/**
 * Automatically use the simple path under these conditions:
 *   1. offsetFrom and offsetTo are defined and are numbers AND
 *   2. Either offsetFrom and offsetTo are equal and the combination of
 *        slope (k) and type is one of the following cases:
 *     2.1 k = 0 or ∞ and type is Diagonal or Perpendicular OR
 *     2.2 k = 1 or -1 and type is Diagonal or RotatePerpendicular
 *   3. Or offsetFrom and offsetTo
 */
export const checkSimplePathAvailability = (
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

    // offsetFrom === offsetTo can always be checked as offset = 0.
    // It is just parallel to the line from (x1,y1) to (x2,y2).
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
    // E.g. dot1(0,0) dot2(10,10) with offsetFrom=10 and offsetTo=0 result in multiple valid origin and
    //      target combination for simple path such as dot1'(10,0) dot2(10,10) or dot1'(0,10) dot2(10,10).
    // This should be considered a feature instead of a bug and suggest user to slightly move the dot.
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
 * Auto parallel instead of manual offset tweaks when parallelIndex > 0 (non base parallel line).
 */
export const reconcileSimplePathWithParallel = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    offset: number,
    parallelIndex: number
) => {
    if (x1 === x2) {
        return { x1: x1 + 5 * parallelIndex, y1, x2: x2 + 5 * parallelIndex, y2, offset };
    }
    if (y1 === y2) {
        return { x1, y1: y1 + 5 * parallelIndex, x2, y2: y2 + 5 * parallelIndex, offset };
    }
    return {
        x1: x1 + 5 * Math.SQRT1_2 * parallelIndex,
        y1: y1 + 5 * Math.SQRT1_2 * parallelIndex,
        x2: x2 + 5 * Math.SQRT1_2 * parallelIndex,
        y2: y2 + 5 * Math.SQRT1_2 * parallelIndex,
        offset,
    };
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
