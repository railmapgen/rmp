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

export const getThinTailMarkerId = (id: string, decorationAt: DecorationAt) =>
    `jr_east_pattern_thin_tail_${decorationAt}_${id}`;

export const getBlackBlockMarkerId = (id: string, decorationAt: DecorationAt) =>
    `jr_east_pattern_black_block_${decorationAt}_${id}`;

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
    rects: JREastRectMarkerProps[];
}

const JREastMarker = ({ id, rects }: JREastMarkerProps) => (
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

interface JREastThinTailMarkerProps {
    id: string;
    fill: string;
    length?: number;
    thickness?: number;
    includeBlackBlock?: boolean;
    blackBlockLength?: number;
    blackBlockThickness?: number;
    blackBlockFill?: string;
}

export const JREastThinTailMarker = ({
    id,
    fill,
    length = THIN_TAIL_LENGTH,
    thickness = THIN_TAIL_WIDTH,
    includeBlackBlock = false,
    blackBlockLength = THIN_TAIL_BLACK_BLOCK_LENGTH,
    blackBlockThickness = BLACK_BLOCK_THICKNESS,
    blackBlockFill = 'black',
}: JREastThinTailMarkerProps) => (
    <JREastMarker
        id={id}
        rects={[
            { fill, length, thickness, x: 0 },
            ...(includeBlackBlock
                ? [
                      {
                          fill: blackBlockFill,
                          length: blackBlockLength,
                          thickness: blackBlockThickness,
                          x: -blackBlockLength,
                      },
                  ]
                : []),
        ]}
    />
);

interface JREastBlackBlockMarkerProps {
    id: string;
    fill?: string;
    length?: number;
    thickness?: number;
}

export const JREastBlackBlockMarker = ({
    id,
    fill = 'black',
    length = BLACK_BLOCK_LENGTH,
    thickness = BLACK_BLOCK_THICKNESS,
}: JREastBlackBlockMarkerProps) => <JREastMarker id={id} rects={[{ fill, length, thickness, x: -length }]} />;

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
            label: t('panel.details.lines.jrEastSingleColorPattern.decoration.displayName'),
            value: attrs.decoration ?? defaultJREastSingleColorDecorationAttributes.decoration,
            options: {
                none: t('panel.details.lines.jrEastSingleColorPattern.decoration.none'),
                'thin-tail': t('panel.details.lines.jrEastSingleColorPattern.decoration.thinTail'),
                'black-block': t('panel.details.lines.jrEastSingleColorPattern.decoration.blackBlock'),
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
            label: t('panel.details.lines.jrEastSingleColorPattern.decorationAt.displayName'),
            value: attrs.decorationAt ?? defaultJREastSingleColorDecorationAttributes.decorationAt,
            options: {
                from: t('panel.details.lines.jrEastSingleColorPattern.decorationAt.from'),
                to: t('panel.details.lines.jrEastSingleColorPattern.decorationAt.to'),
            },
            onChange: val => {
                attrs.decorationAt = val as DecorationAt;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];
};
