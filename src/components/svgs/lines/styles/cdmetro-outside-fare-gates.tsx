import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../../constants/constants';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const CDMetroOutsideFareGates = (props: LineStyleComponentProps<CDMetroOutsideFareGatesAttributes>) => {
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
            strokeWidth="6"
            strokeDasharray="6 5"
            cursor="pointer"
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
        />
    );
};

/**
 * CDMetroOutsideFareGates specific props.
 */
export interface CDMetroOutsideFareGatesAttributes extends LinePathAttributes {}

const cdMetroOutsideFareGatesAttrsComponent = (props: AttrsProps<CDMetroOutsideFareGatesAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [];

    return <RmgFields fields={fields} />;
};

const cdMetroOutsideFareGates: LineStyle<CDMetroOutsideFareGatesAttributes> = {
    component: CDMetroOutsideFareGates,
    attrsComponent: cdMetroOutsideFareGatesAttrsComponent,
    defaultAttrs: {},
    metadata: {
        displayName: 'panel.details.lines.cdMetroOutsideFareGates.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default cdMetroOutsideFareGates;
