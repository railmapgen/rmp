import { Button } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { LineId } from '../../../../constants/constants';
import {
    LinePath,
    LinePathAttributes,
    LinePathAttrsProps,
    LinePathType,
    PathGenerator,
} from '../../../../constants/lines';
import { useRootDispatch } from '../../../../redux';
import { setSelected } from '../../../../redux/runtime/runtime-slice';
import { getBaseParallelLineID } from '../../../../util/parallel';
import { roundPathCorners } from '../../../../util/pathRounding';

const generateRotatePerpendicularPath: PathGenerator<RotatePerpendicularPathAttributes> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: RotatePerpendicularPathAttributes = defaultRotatePerpendicularPathAttributes
) => {
    // get type specific attrs with default value if not provided
    const {
        startFrom = defaultRotatePerpendicularPathAttributes.startFrom,
        offsetFrom = defaultRotatePerpendicularPathAttributes.offsetFrom,
        offsetTo = defaultRotatePerpendicularPathAttributes.offsetTo,
        roundCornerFactor = defaultRotatePerpendicularPathAttributes.roundCornerFactor,
    } = attrs;

    const [offset1, offset2] = startFrom === 'from' ? [offsetFrom, offsetTo] : [offsetTo, offsetFrom];
    const [dx1, dy1, dx2, dy2] = startFrom === 'from' ? [0, offset1, offset2, 0] : [offset1, 0, 0, offset2];

    // Rotate the coordinate system to 45° counter-clockwise.
    // Everything else is the same as perpendicular, note to rotate the point before any calculation!
    // reference:
    //  https://zhuanlan.zhihu.com/p/283015520
    //  https://zhuanlan.zhihu.com/p/617145721
    const [rx1, ry1, rx2, ry2] = [
        x1 * Math.SQRT1_2 + y1 * Math.SQRT1_2,
        -x1 * Math.SQRT1_2 + y1 * Math.SQRT1_2,
        x2 * Math.SQRT1_2 + y2 * Math.SQRT1_2,
        -x2 * Math.SQRT1_2 + y2 * Math.SQRT1_2,
    ];
    // get the new x1', y1', x2', y2' with offset (d) added
    const [rx1offset, ry1offset, rx2offset, ry2offset] = [rx1 + dx1, ry1 + dy1, rx2 + dx2, ry2 + dy2];
    // rotate the coordinate system back to 0°
    const [x1offset, y1offset, x2offset, y2offset] = [
        rx1offset * Math.SQRT1_2 - ry1offset * Math.SQRT1_2,
        rx1offset * Math.SQRT1_2 + ry1offset * Math.SQRT1_2,
        rx2offset * Math.SQRT1_2 - ry2offset * Math.SQRT1_2,
        rx2offset * Math.SQRT1_2 + ry2offset * Math.SQRT1_2,
    ];

    // get the middle (turing) point in the rotated 45° coordinate system
    const rx = startFrom === 'from' ? rx2 + dx2 : rx1 + dx1;
    const ry = startFrom === 'from' ? ry1 + dy1 : ry2 + dy2;
    // rotate the coordinate system back to 0° for the middle (turing) point
    const [x, y] = [rx * Math.SQRT1_2 - ry * Math.SQRT1_2, rx * Math.SQRT1_2 + ry * Math.SQRT1_2];

    const path = roundPathCorners(
        `M ${x1offset} ${y1offset} L ${x} ${y} L ${x2offset} ${y2offset}`,
        roundCornerFactor,
        false
    ) as `M ${string}`;

    return path;
};

/**
 * Rotate perpendicular specific props.
 */
export interface RotatePerpendicularPathAttributes extends LinePathAttributes {
    /**
     * Change the drawing direction of line.
     * e.g. from
     *        b
     *         \
     *         /
     *        /
     *       a
     * e.g. to
     *        b
     *       /
     *      /
     *      \
     *       a
     */
    startFrom: 'from' | 'to';
    offsetFrom: number;
    offsetTo: number;
    roundCornerFactor: number;
}

const defaultRotatePerpendicularPathAttributes: RotatePerpendicularPathAttributes = {
    startFrom: 'from',
    offsetFrom: 0,
    offsetTo: 0,
    roundCornerFactor: 18.33,
};

const attrsComponent = (props: LinePathAttrsProps<RotatePerpendicularPathAttributes>) => {
    const { id, attrs, handleAttrsUpdate, recalculateParallelIndex, parallelIndex } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const baseParallelLineID = getBaseParallelLineID(window.graph, LinePathType.RotatePerpendicular, id as LineId);
    const isParallelDisabled = parallelIndex >= 0 && baseParallelLineID !== id;

    const fields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('panel.details.lines.common.startFrom'),
            value: attrs.startFrom,
            options: { from: t('panel.details.lines.common.from'), to: t('panel.details.lines.common.to') },
            onChange: val => {
                recalculateParallelIndex(id, val as 'from' | 'to');
                attrs.startFrom = val as 'from' | 'to';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.common.offsetFrom'),
            value: (attrs.offsetFrom ?? defaultRotatePerpendicularPathAttributes.offsetFrom).toString(),
            variant: 'number',
            onChange: val => {
                if (Number.isNaN(val)) val = '0';
                attrs.offsetFrom = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            isDisabled: isParallelDisabled,
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.common.offsetTo'),
            value: (attrs.offsetTo ?? defaultRotatePerpendicularPathAttributes.offsetTo).toString(),
            variant: 'number',
            onChange: val => {
                if (Number.isNaN(val)) val = '0';
                attrs.offsetTo = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            isDisabled: isParallelDisabled,
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.common.roundCornerFactor'),
            value: (attrs?.roundCornerFactor ?? defaultRotatePerpendicularPathAttributes.roundCornerFactor).toString(),
            variant: 'number',
            onChange: val => {
                if (Number.isNaN(val) || Number(val) < 0) val = '0';
                attrs.roundCornerFactor = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            isDisabled: isParallelDisabled,
            minW: 'full',
        },
    ];

    if (isParallelDisabled) {
        fields.unshift({
            type: 'custom',
            label: t('panel.details.lines.common.parallelDisabled'),
            component: (
                <Button size="sm" variant="link" onClick={() => dispatch(setSelected(new Set([baseParallelLineID])))}>
                    {t('panel.details.lines.common.changeInBaseLine')} {baseParallelLineID}
                </Button>
            ),
        });
    }

    return <RmgFields fields={fields} />;
};

const rotatePerpendicularIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M9,6L15,12L9,18" stroke="currentColor" fill="none" />
    </svg>
);

const rotatePerpendicularPath: LinePath<RotatePerpendicularPathAttributes> = {
    generatePath: generateRotatePerpendicularPath,
    icon: rotatePerpendicularIcon,
    defaultAttrs: defaultRotatePerpendicularPathAttributes,
    attrsComponent,
    metadata: { displayName: 'panel.details.lines.rotatePerpendicular.displayName' },
};

export default rotatePerpendicularPath;
