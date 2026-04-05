import { RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import type { AttrsProps } from '../../../../constants/constants';
import { LINE_WIDTH, type LinePathAttributes, type LineStyleType } from '../../../../constants/lines';
import type { ColorAttribute } from '../../../panels/details/color-field';
import { ColorField } from '../../../panels/details/color-field';

export const THIN_TAIL_LENGTH = LINE_WIDTH * 1.15;
export const THIN_TAIL_WIDTH = LINE_WIDTH * 0.25;
export const THIN_TAIL_MARKER_BOX = 20;
export const BLACK_BLOCK_LENGTH = LINE_WIDTH * 0.2;
export const BLACK_BLOCK_THICKNESS = LINE_WIDTH;
export const THIN_TAIL_BLACK_BLOCK_LENGTH = LINE_WIDTH * 0.025;

export type DecorationType = 'none' | 'thin-tail' | 'black-block';
export type DecorationAt = 'from' | 'to';

export interface JREastSingleColorDecorationAttributes {
    decoration: DecorationType;
    decorationAt: DecorationAt;
}

export interface JREastSingleColorSharedAttributes
    extends LinePathAttributes,
        ColorAttribute,
        JREastSingleColorDecorationAttributes {}

export const defaultJREastSingleColorDecorationAttributes: JREastSingleColorDecorationAttributes = {
    decoration: 'none',
    decorationAt: 'to',
};

export const getJREastMarkerId = (id: string, decoration: DecorationType, decorationAt: DecorationAt) =>
    `jr_east_pattern_${decoration}_${decorationAt}_${id}`;

export const getJREastDecorationMarkerProps = (markerId: string, decorationAt: DecorationAt) =>
    decorationAt === 'from' ? { markerStart: `url(#${markerId})` } : { markerEnd: `url(#${markerId})` };

interface JREastRectMarkerProps {
    fill: string;
    length: number;
    thickness: number;
    x: number;
}

const JREastRectMarker = ({ fill, length, thickness, x }: JREastRectMarkerProps) => (
    <rect x={x} y={-thickness / 2} width={length} height={thickness} fill={fill} />
);

interface JREastMarkerProps {
    id: string;
    fill: string;
    thinTail: boolean;
    blackBlock: boolean;
}

export const JREastMarker = ({ id, fill, thinTail, blackBlock }: JREastMarkerProps) => {
    const blackBlockLength = thinTail ? THIN_TAIL_BLACK_BLOCK_LENGTH : BLACK_BLOCK_LENGTH;
    const rects: JREastRectMarkerProps[] = [
        ...(thinTail
            ? [
                  {
                      fill,
                      length: THIN_TAIL_LENGTH,
                      thickness: THIN_TAIL_WIDTH,
                      x: 0,
                  },
              ]
            : []),
        ...(blackBlock
            ? [
                  {
                      fill: 'black',
                      length: blackBlockLength,
                      thickness: BLACK_BLOCK_THICKNESS,
                      x: -blackBlockLength,
                  },
              ]
            : []),
    ];

    if (!rects.length) return null;

    return (
        <marker
            id={id}
            viewBox={`${-THIN_TAIL_MARKER_BOX} ${-THIN_TAIL_MARKER_BOX} ${THIN_TAIL_MARKER_BOX * 2} ${
                THIN_TAIL_MARKER_BOX * 2
            }`}
            markerWidth={THIN_TAIL_MARKER_BOX * 2}
            markerHeight={THIN_TAIL_MARKER_BOX * 2}
            refX={0}
            refY={0}
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
        >
            {rects.map((rect, index) => (
                <JREastRectMarker key={`${id}_${index}`} {...rect} />
            ))}
        </marker>
    );
};

export const makeJREastDecorationFields = <T extends JREastSingleColorSharedAttributes>(
    props: AttrsProps<T>,
    styleType: LineStyleType,
    defaultTheme: T['color']
): RmgFieldsField[] => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    return [
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={styleType} defaultTheme={defaultTheme} />,
        },
        {
            type: 'select',
            label: t('panel.details.lines.jrEastSingleColor.decoration.displayName'),
            value: attrs.decoration ?? defaultJREastSingleColorDecorationAttributes.decoration,
            options: {
                none: t('panel.details.lines.jrEastSingleColor.decoration.none'),
                'thin-tail': t('panel.details.lines.jrEastSingleColor.decoration.thinTail'),
                'black-block': t('panel.details.lines.jrEastSingleColor.decoration.blackBlock'),
            },
            onChange: val => {
                attrs.decoration = val as DecorationType;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            hidden: (attrs.decoration ?? defaultJREastSingleColorDecorationAttributes.decoration) === 'none',
            label: t('panel.details.lines.jrEastSingleColor.decorationAt.displayName'),
            value: attrs.decorationAt ?? defaultJREastSingleColorDecorationAttributes.decorationAt,
            options: {
                from: t('panel.details.lines.jrEastSingleColor.decorationAt.from'),
                to: t('panel.details.lines.jrEastSingleColor.decorationAt.to'),
            },
            onChange: val => {
                attrs.decorationAt = val as DecorationAt;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];
};
