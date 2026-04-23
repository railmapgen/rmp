import {
    LineStyleType,
    LineStyleComponentProps,
    ExternalLineStyleAttributes,
    LinePathType,
} from '../../../constants/lines';
import { lineStyles, linePaths } from '../../svgs/lines/lines';

type StyleComponent = React.FC<
    LineStyleComponentProps<NonNullable<ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]>>
>;

export const LineStyleLeftIcon = (props: { style: LineStyleType }) => {
    const { style } = props;
    const LinePreComponent = lineStyles[style].preComponent as StyleComponent | undefined;
    const LineComponent = lineStyles[style].component as StyleComponent;
    const LinePostComponent = lineStyles[style].postComponent as StyleComponent | undefined;
    const styleAttr = structuredClone(
        lineStyles[style].defaultAttrs as NonNullable<ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]>
    );
    const path = linePaths[LinePathType.Simple].generatePath(10, 38, 38, 10, { offset: 0 });

    return (
        <svg viewBox="0 0 48 48" height={40} width={40} focusable={false}>
            {LinePreComponent && (
                <LinePreComponent
                    id={`line_icon_${style}_pre`}
                    type={LinePathType.Simple}
                    path={path}
                    styleAttrs={styleAttr}
                    newLine={false}
                    handlePointerDown={() => {}}
                />
            )}
            <LineComponent
                id={`line_icon_${style}`}
                type={LinePathType.Simple}
                path={path}
                styleAttrs={styleAttr}
                newLine={false}
                handlePointerDown={() => {}}
            />
            {LinePostComponent && (
                <LinePostComponent
                    id={`line_icon_${style}_post`}
                    type={LinePathType.Simple}
                    path={path}
                    styleAttrs={styleAttr}
                    newLine={false}
                    handlePointerDown={() => {}}
                />
            )}
        </svg>
    );
};
