import React from 'react';
import { LineId } from '../../../constants/constants';
import {
    ExternalLinePathAttributes,
    ExternalLineStyleAttributes,
    LinePathType,
    LineStyleComponentProps,
    LineWrapperComponentProps,
    Path,
} from '../../../constants/lines';
import { checkSimplePathAvailability } from '../../../util/auto-simple';
import { UnknownLineStyle } from '../common/unknown';
import { linePaths, lineStyles } from './lines';

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
        [type, JSON.stringify(attrs), x1, x2, y1, y2]
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
): Path => {
    if (!(type in linePaths)) {
        // unknown line path type
        return `M ${x1} ${y1} L ${x2} ${y2}`;
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
