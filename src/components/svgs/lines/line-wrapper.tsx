import React from 'react';
import {
    ExternalLineStyleAttributes,
    LinePathType,
    LineStyleComponentProps,
    LineWrapperComponentProps,
} from '../../../constants/lines';
import { linePaths, lineStyles } from './lines';

const LineWrapper = (props: LineWrapperComponentProps) => {
    const {
        id,
        type,
        attrs = linePaths[type].defaultAttrs,
        styleType,
        styleAttrs = lineStyles[styleType].defaultAttrs,
        newLine,
        handleClick,
    } = props;
    const { x1, y1, x2, y2 } = props;

    const [path, setPath] = React.useState('M 0,0 L 0,0' as `${'M'}${string}`);
    React.useEffect(() => {
        let p: `${'M'}${string}` = 'M 0,0 L 0,0';
        // TODO: Remove `attrs as any`.
        // Automatically use the simple path under these conditions:
        //   1. offsetFrom and offsetTo are defined, numbers and equal AND
        //   2. The combination of slope (k) and type is one of the following cases:
        //     2.1. k = 0 or ∞ and type is Diagonal or Perpendicular OR
        //     2.2. k = 1 or -1 and type is Diagonal or RotatePerpendicular
        if (
            ['offsetFrom', 'offsetTo'].every(o => Object.keys(attrs).includes(o)) &&
            !Number.isNaN((attrs as any)['offsetFrom']) &&
            !Number.isNaN((attrs as any)['offsetTo']) &&
            (attrs as any)['offsetFrom'] === (attrs as any)['offsetTo'] &&
            (((x1 === x2 || y1 === y2) && [LinePathType.Diagonal, LinePathType.Perpendicular].includes(type)) ||
                (Math.abs((y2 - y1) / (x2 - x1)) === 1 &&
                    [LinePathType.Diagonal, LinePathType.RotatePerpendicular].includes(type)))
        ) {
            const offset = (attrs as any)['offsetFrom'];
            p = linePaths[LinePathType.Simple].generatePath(x1, x2, y1, y2, { offset });
        } else {
            p = linePaths[type].generatePath(x1, x2, y1, y2, attrs as any);
        }
        setPath(p);
    }, [type, JSON.stringify(attrs), x1, x2, y1, y2]);

    // HELP NEEDED: Why component is not this type?
    const StyleComponent = lineStyles[styleType].component as <
        T extends NonNullable<ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]>
    >(
        props: LineStyleComponentProps<T>
    ) => JSX.Element;

    return React.useMemo(
        () => (
            <StyleComponent
                id={id}
                type={type}
                path={path}
                styleAttrs={styleAttrs}
                newLine={newLine}
                handleClick={handleClick}
            />
        ),
        [id, type, path, styleType, JSON.stringify(styleAttrs), newLine, handleClick]
    );
};

export default LineWrapper;
