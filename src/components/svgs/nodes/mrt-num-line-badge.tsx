import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';

const MRTNumLineBadge = (props: NodeComponentProps<MRTNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultMRTNumLineBadgeAttributes.num, color = defaultMRTNumLineBadgeAttributes.color } =
        attrs ?? defaultMRTNumLineBadgeAttributes;

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

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                <rect fill={bgColor} x="-6" y="-6" width="12" height="12" rx="6" ry="6" />
                <text
                    className="rmp-name__mrt"
                    textAnchor="middle"
                    x="0"
                    y="0"
                    width="12"
                    height="12"
                    fill={fgColor}
                    fontSize="9"
                    dominantBaseline="central"
                    letterSpacing="-0.2"
                >
                    {num}
                </text>
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    fill="white"
                    fillOpacity="0"
                    x="-6"
                    y="-6"
                    width="12"
                    height="12"
                    rx="6"
                    ry="6"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
        ),
        [id, x, y, num, ...color, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * MRTNumLineBadge specific props.
 */
export interface MRTNumLineBadgeAttributes extends AttributesWithColor {
    num: number;
}

const defaultMRTNumLineBadgeAttributes: MRTNumLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Singapore, 'ewl', '#009739', MonoColour.white],
};

const mrtNumLineBadgeAttrsComponent = (props: AttrsProps<MRTNumLineBadgeAttributes>) => {
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
                <ColorField type={MiscNodeType.MRTNumLineBadge} defaultTheme={defaultMRTNumLineBadgeAttributes.color} />
            ),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const mrtNumLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="2" rx="10" ry="10" width="20" height="20" />
        <text x="9" y="17" fill="white" fontSize="14">
            1
        </text>
    </svg>
);

const mrtNumLineBadge: Node<MRTNumLineBadgeAttributes> = {
    component: MRTNumLineBadge,
    icon: mrtNumLineBadgeIcon,
    defaultAttrs: defaultMRTNumLineBadgeAttributes,
    attrsComponent: mrtNumLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.MRTNumLineBadge.displayName',
        tags: [],
    },
};

export default mrtNumLineBadge;
