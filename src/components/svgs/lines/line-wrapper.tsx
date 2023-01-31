import React from 'react';
import { ExternalLineStyleAttributes } from '../../../constants/lines';
import { LineWrapperComponentProps, LineStyleComponentProps } from '../../../constants/lines';
import { linePaths, lineStyles } from './lines';

const LineWrapper = (props: LineWrapperComponentProps) => {
    const { id, type, attrs, styleType, styleAttrs = lineStyles[styleType].defaultAttrs, newLine, handleClick } = props;
    const { x1, y1, x2, y2 } = props;

    const [path, setPath] = React.useState('M 0,0' as `${'m' | 'M'}${string}`);
    React.useEffect(() => {
        setPath(linePaths[type].generatePath(x1, x2, y1, y2, attrs as any).d);
    }, [type, JSON.stringify(attrs), x1, x2, y1, y2]);

    // HELP NEEDED: Why component is not this type?
    const StyleComponent = lineStyles[styleType].component as <
        T extends NonNullable<ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]>
    >(
        props: LineStyleComponentProps<T>
    ) => JSX.Element;

    return React.useMemo(
        () => (
            <StyleComponent id={id} path={path} styleAttrs={styleAttrs} newLine={newLine} handleClick={handleClick} />
        ),
        [id, path, styleType, JSON.stringify(styleAttrs), newLine, handleClick]
    );
};

export default LineWrapper;
