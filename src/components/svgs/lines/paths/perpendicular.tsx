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

const generatePerpendicularPath: PathGenerator<PerpendicularPathAttributes> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: PerpendicularPathAttributes = defaultPerpendicularPathAttributes
) => {
    // get type specific attrs with default value
    const {
        startFrom = defaultPerpendicularPathAttributes.startFrom,
        offsetFrom = defaultPerpendicularPathAttributes.offsetFrom,
        offsetTo = defaultPerpendicularPathAttributes.offsetTo,
        roundCornerFactor = defaultPerpendicularPathAttributes.roundCornerFactor,
    } = attrs;

    const [offset1, offset2] = startFrom === 'from' ? [offsetFrom, offsetTo] : [offsetTo, offsetFrom];
    const [dx1, dy1, dx2, dy2] = startFrom === 'from' ? [0, offset1, offset2, 0] : [offset1, 0, 0, offset2];

    const x = startFrom === 'from' ? x2 + dx2 : x1 + dx1;
    const y = startFrom === 'from' ? y1 + dy1 : y2 + dy2;

    const path = roundPathCorners(
        `M ${x1 + dx1} ${y1 + dy1} L ${x} ${y} L ${x2 + dx2} ${y2 + dy2}`,
        roundCornerFactor,
        false
    ) as `M ${string}`;

    return path;
};

/**
 * Perpendicular specific props.
 */
export interface PerpendicularPathAttributes extends LinePathAttributes {
    /**
     * Change the drawing direction of line.
     * e.g. from
     *        b
     *        |
     *      a-┘
     * e.g. to
     *      ┌-b
     *      |
     *      a
     */
    startFrom: 'from' | 'to';
    offsetFrom: number;
    offsetTo: number;
    roundCornerFactor: number;
}

const defaultPerpendicularPathAttributes: PerpendicularPathAttributes = {
    startFrom: 'from',
    offsetFrom: 0,
    offsetTo: 0,
    roundCornerFactor: 18.33,
};

const attrsComponent = (props: LinePathAttrsProps<PerpendicularPathAttributes>) => {
    const { id, attrs, handleAttrsUpdate, recalculateParallelIndex, parallelIndex } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const baseParallelLineID = getBaseParallelLineID(window.graph, LinePathType.Perpendicular, id as LineId);
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
            value: (attrs.offsetFrom ?? defaultPerpendicularPathAttributes.offsetFrom).toString(),
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
            value: (attrs.offsetTo ?? defaultPerpendicularPathAttributes.offsetTo).toString(),
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
            value: (attrs?.roundCornerFactor ?? defaultPerpendicularPathAttributes.roundCornerFactor).toString(),
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

const perpendicularIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M6,6H18V18" stroke="currentColor" fill="none" />
    </svg>
);

const perpendicularPath: LinePath<PerpendicularPathAttributes> = {
    generatePath: generatePerpendicularPath,
    icon: perpendicularIcon,
    defaultAttrs: defaultPerpendicularPathAttributes,
    attrsComponent,
    metadata: { displayName: 'panel.details.lines.perpendicular.displayName' },
};

export default perpendicularPath;
