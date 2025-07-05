import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const MRTDestinationNumbers = (props: NodeComponentProps<MRTDestinationNumbersAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultMRTDestinationNumbersAttributes.num, color = defaultMRTDestinationNumbersAttributes.color } =
        attrs ?? defaultMRTDestinationNumbersAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );
    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerMove(id, e),
        [id, handlePointerMove]
    );
    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerUp(id, e),
        [id, handlePointerUp]
    );

    const fgColor = color[3];
    const bgColor = color[2];

    return (
        <g
            id={id}
            transform={`translate(${x}, ${y})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <circle r="8" fill={bgColor}></circle>
            <text
                {...getLangStyle(TextLanguage.mrt)}
                textAnchor="middle"
                x="0"
                y="0"
                width="12"
                height="12"
                fill={fgColor}
                fontSize="12"
                dominantBaseline="central"
                letterSpacing="-0.2"
            >
                {num}
            </text>
        </g>
    );
};

/**
 * MRTDestinationNumbers specific props.
 */
export interface MRTDestinationNumbersAttributes extends ColorAttribute {
    num: number;
}

const defaultMRTDestinationNumbersAttributes: MRTDestinationNumbersAttributes = {
    num: 1,
    color: [CityCode.Singapore, 'ewl', '#009739', MonoColour.white],
};

const mrtDestinationNumbersAttrsComponent = (props: AttrsProps<MRTDestinationNumbersAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.num'),
            value: String(attrs.num),
            validator: (val: string) => !Number.isNaN(val),
            onChange: (val: string | number) => {
                attrs.num = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.MRTDestinationNumbers}
                    defaultTheme={defaultMRTDestinationNumbersAttributes.color}
                />
            ),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const mrtDestinationNumbersIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="2" rx="10" ry="10" width="20" height="20" />
        <text x="9" y="17" fill="white" fontSize="14">
            1
        </text>
    </svg>
);

const mrtDestinationNumbers: Node<MRTDestinationNumbersAttributes> = {
    component: MRTDestinationNumbers,
    icon: mrtDestinationNumbersIcon,
    defaultAttrs: defaultMRTDestinationNumbersAttributes,
    attrsComponent: mrtDestinationNumbersAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.mrtDestinationNumbers.displayName',
        tags: [],
    },
};

export default mrtDestinationNumbers;
