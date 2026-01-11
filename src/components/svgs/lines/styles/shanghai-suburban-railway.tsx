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

const ShanghaiSuburbanRailwayPre = (props: LineStyleComponentProps<ShanghaiSuburbanRailwayAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const { isEnd = defaultShanghaiSuburbanRailwayAttributes.isEnd } = styleAttrs;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const outStrokeLinecap = isEnd ? 'round' : undefined;

    return (
        <g
            id={`${id}.pre`}
            onPointerDown={newLine ? undefined : onPointerDown}
            pointerEvents={newLine ? 'none' : undefined}
            cursor="pointer"
        >
            <path d={path} fill="none" stroke="#898989" strokeWidth={LINE_WIDTH} strokeLinecap={outStrokeLinecap} />
        </g>
    );
};

const ShanghaiSuburbanRailway = (props: LineStyleComponentProps<ShanghaiSuburbanRailwayAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g
            id={id}
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path d={path} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </g>
    );
};

/**
 * ShanghaiSuburbanRailway specific props.
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
    preComponent: ShanghaiSuburbanRailwayPre,
    defaultAttrs: defaultShanghaiSuburbanRailwayAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.shanghaiSuburbanRailway.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default shanghaiSuburbanRailway;
