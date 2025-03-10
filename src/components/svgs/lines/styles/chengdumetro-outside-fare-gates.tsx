import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../../constants/constants';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const ChengduMetroOutsideFareGates = (props: LineStyleComponentProps<ChengduMetroOutsideFareGatesAttributes>) => {
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
            strokeWidth="5"
            strokeDasharray="6 5"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * ChengduMetroOutsideFareGates specific props.
 */
export interface ChengduMetroOutsideFareGatesAttributes extends LinePathAttributes {}

const chengduMetroOutsideFareGatesAttrsComponent = (props: AttrsProps<ChengduMetroOutsideFareGatesAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [];

    return <RmgFields fields={fields} />;
};

const chengduMetroOutsideFareGates: LineStyle<ChengduMetroOutsideFareGatesAttributes> = {
    component: ChengduMetroOutsideFareGates,
    attrsComponent: chengduMetroOutsideFareGatesAttrsComponent,
    defaultAttrs: {},
    metadata: {
        displayName: 'panel.details.lines.chengduMetroOutsideFareGates.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default chengduMetroOutsideFareGates;
