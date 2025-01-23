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

const generateDiagonalPath: PathGenerator<DiagonalPathAttributes> = (
    propsx1: number,
    propsx2: number,
    propsy1: number,
    propsy2: number,
    attrs: DiagonalPathAttributes = defaultDiagonalPathAttributes
) => {
    const {
        startFrom = defaultDiagonalPathAttributes.startFrom,
        offsetFrom = defaultDiagonalPathAttributes.offsetFrom,
        offsetTo = defaultDiagonalPathAttributes.offsetTo,
        roundCornerFactor = defaultDiagonalPathAttributes.roundCornerFactor,
    } = attrs;

    // Flip x and y if startFrom === 'to' and from now on,
    // we always draw vertical or horizontal line from p1 instead of propsx1, propsy1.
    const [x1a, y1a, x2a, y2a] =
        startFrom === 'from' ? [propsx1, propsy1, propsx2, propsy2] : [propsx2, propsy2, propsx1, propsy1];

    // Indicate the line angle start from p1.
    const horizontalOrVertical = Math.abs(x2a - x1a) < Math.abs(y2a - y1a) ? 'vertical' : 'horizontal';

    // Calculate dx and dy.
    // Note for p2, we always need to calculate dx and dy from the hypotenuse of the right triangle.
    const [offset1, offset2] = startFrom === 'from' ? [offsetFrom, offsetTo] : [offsetTo, offsetFrom];
    const dx1 = horizontalOrVertical === 'horizontal' ? 0 : offset1;
    const dy1 = horizontalOrVertical === 'horizontal' ? offset1 : 0;
    const dx2 = offset2 * Math.SQRT1_2;
    const dy2 = offset2 * Math.SQRT1_2 * ((x2a - x1a) * (y2a - y1a) < 0 ? 1 : -1);

    // Get our final x and y with dx and dy.
    const [x1b, y1b, x2b, y2b] = [x1a + dx1, y1a + dy1, x2a + dx2, y2a + dy2];

    // Now calculate the middle point where line turn from vertical or horizontal to diagonal.
    const x = horizontalOrVertical === 'horizontal' ? x2b + Math.abs(y2b - y1b) * (x2b - x1b > 0 ? -1 : 1) : x1b;
    const y = horizontalOrVertical === 'horizontal' ? y1b : y2b + Math.abs(x2b - x1b) * (y2b - y1b > 0 ? -1 : 1);

    // Flip back x and y if startFrom === 'to', so the final line will always start from p1 and ends at p2
    // This is crucial in reconcile process where we need line segments from the whole start to end.
    const [x1, y1, x2, y2] = startFrom === 'from' ? [x1b, y1b, x2b, y2b] : [x2b, y2b, x1b, y1b];

    // Round the path with corners.
    const path = roundPathCorners(`M ${x1} ${y1} L ${x} ${y} L ${x2} ${y2}`, roundCornerFactor, false) as `M ${string}`;

    return path;
};

/**
 * Diagonal specific props.
 */
export interface DiagonalPathAttributes extends LinePathAttributes {
    /**
     * Change the drawing direction of line.
     * e.g. from
     *         b
     *        /
     *      a-
     * e.g. to
     *        -b
     *       /
     *      a
     */
    startFrom: 'from' | 'to';
    offsetFrom: number;
    offsetTo: number;
    roundCornerFactor: number;
}

const defaultDiagonalPathAttributes: DiagonalPathAttributes = {
    startFrom: 'from',
    offsetFrom: 0,
    offsetTo: 0,
    roundCornerFactor: 10,
};

const attrsComponent = (props: LinePathAttrsProps<DiagonalPathAttributes>) => {
    const { id, attrs, handleAttrsUpdate, recalculateParallelIndex, parallelIndex } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const baseParallelLineID = getBaseParallelLineID(window.graph, LinePathType.Diagonal, id as LineId);
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
            value: (attrs.offsetFrom ?? defaultDiagonalPathAttributes.offsetFrom).toString(),
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
            value: (attrs.offsetTo ?? defaultDiagonalPathAttributes.offsetTo).toString(),
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
            value: (attrs?.roundCornerFactor ?? defaultDiagonalPathAttributes.roundCornerFactor).toString(),
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

const diagonalIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M9,18V12L15,6" stroke="currentColor" fill="none" />
    </svg>
);

const diagonalPath: LinePath<DiagonalPathAttributes> = {
    generatePath: generateDiagonalPath,
    icon: diagonalIcon,
    defaultAttrs: defaultDiagonalPathAttributes,
    attrsComponent,
    metadata: { displayName: 'panel.details.lines.diagonal.displayName' },
};

export default diagonalPath;
