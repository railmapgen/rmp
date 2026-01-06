import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
} from '../../../../constants/lines';

const ChengduRTOutsideFareGates = (props: LineStyleComponentProps<ChengduRTOutsideFareGatesAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <path
            id={id}
            d={path}
            fill="none"
            stroke="#b4b4b5"
            strokeWidth={LINE_WIDTH}
            strokeDasharray={`${LINE_WIDTH + 1} ${LINE_WIDTH}`}
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * ChengduRTOutsideFareGates specific props.
 */
export interface ChengduRTOutsideFareGatesAttributes extends LinePathAttributes {}

const chengduRTOutsideFareGatesAttrsComponent = () => undefined;

const chengduRTOutsideFareGates: LineStyle<ChengduRTOutsideFareGatesAttributes> = {
    component: ChengduRTOutsideFareGates,
    attrsComponent: chengduRTOutsideFareGatesAttrsComponent,
    defaultAttrs: {},
    metadata: {
        displayName: 'panel.details.lines.chengduRTOutsideFareGates.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default chengduRTOutsideFareGates;
