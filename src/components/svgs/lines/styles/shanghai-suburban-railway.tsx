import React from 'react';
import { LinePathAttributes, LinePathType, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';
import { AttrsProps } from '../../../../constants/constants';
import { useTranslation } from 'react-i18next';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';

const ShanghaiSuburbanRailway = (props: LineStyleComponentProps<ShanghaiSuburbanRailwayAttributes>) => {
    const { id, path, styleAttrs, handlePointerDown } = props;
    const { isEnd = defaultShanghaiSuburbanRailwayAttributes.isEnd } = styleAttrs;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const outStrokeLinecap = isEnd ? 'round' : undefined;

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={path} fill="none" stroke="#898989" strokeWidth="5" strokeLinecap={outStrokeLinecap} />
            <path d={path} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </g>
    );
};

/**
 * ShanghaiSuburbanRailway has no specific props.
 */
export interface ShanghaiSuburbanRailwayAttributes extends LinePathAttributes {
    isEnd: boolean;
}

const defaultShanghaiSuburbanRailwayAttributes: ShanghaiSuburbanRailwayAttributes = {
    isEnd: false,
};

const attrsComponent = (props: AttrsProps<ShanghaiSuburbanRailwayAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('panel.details.lines.shanghaiSuburbanRailway.isEnd'),
            isChecked: attrs.isEnd,
            onChange: (val: boolean) => {
                attrs.isEnd = val;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const shanghaiSuburbanRailway: LineStyle<ShanghaiSuburbanRailwayAttributes> = {
    component: ShanghaiSuburbanRailway,
    defaultAttrs: defaultShanghaiSuburbanRailwayAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.shanghaiSuburbanRailway.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default shanghaiSuburbanRailway;
