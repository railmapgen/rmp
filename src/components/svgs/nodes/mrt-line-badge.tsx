import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';

const MRTLineBadge = (props: NodeComponentProps<MRTLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        lineCode = defaultMRTLineBadgeAttributes.lineCode,
        color = defaultMRTLineBadgeAttributes.color,
        lines = defaultMRTLineBadgeAttributes.lines,
        name = defaultMRTLineBadgeAttributes.name,
        isTram = defaultMRTLineBadgeAttributes.isTram,
    } = attrs ?? defaultMRTLineBadgeAttributes;

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

    const width = 22.85;
    const height = 12.935;

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
            <rect
                transform={`scale(1.8)`}
                x={-width / 2}
                y={-height / 2}
                rx="3"
                ry="6"
                width={width}
                height={height}
                fill={bgColor}
                stroke="white"
                strokeWidth="1"
            />
            <text
                className="rmp-name__mrt"
                textAnchor="middle"
                fill={fgColor}
                fontSize="15"
                dominantBaseline="central"
                letterSpacing="-0.2"
            >
                {lineCode}
            </text>
            <text
                className="rmp-name__mrt"
                textAnchor="left"
                x="28"
                y={isTram ? 3.5 : -3}
                fill="black"
                fontSize="10"
                letterSpacing="-0.2"
            >
                {name}
            </text>
            {!isTram &&
                lines.split(',').map((n, i) => (
                    <g key={i} transform={`translate(${34 + 14 * i}, ${4.5})`}>
                        {n.trim() !== 'airport' ? (
                            <>
                                <circle r="6" fill={bgColor}></circle>
                                <text
                                    className="rmp-name__mrt"
                                    textAnchor="middle"
                                    fill={fgColor}
                                    fontSize="9"
                                    dominantBaseline="central"
                                    letterSpacing="-0.2"
                                >
                                    {n}
                                </text>
                            </>
                        ) : (
                            <>
                                <circle r="6" fill={bgColor}></circle>
                                <image
                                    width="12"
                                    height="12"
                                    x="-6"
                                    y="-6"
                                    href={import.meta.env.BASE_URL + `images/facilities/airport_sg.svg`}
                                />
                            </>
                        )}
                    </g>
                ))}
        </g>
    );
};

/**
 * MRTLineBadge specific props.
 */
export interface MRTLineBadgeAttributes extends AttributesWithColor {
    lineCode: string;
    name: string;
    lines: string;
    isTram: boolean;
}

const defaultMRTLineBadgeAttributes: MRTLineBadgeAttributes = {
    lineCode: 'EWL',
    name: 'East-West Line',
    lines: '1, 2, 3, airport',
    isTram: false,
    color: [CityCode.Singapore, 'ewl', '#009739', MonoColour.white],
};

const mrtLineBadgeAttrsComponent = (props: AttrsProps<MRTLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.nameEn'),
            value: attrs.name,
            onChange: val => {
                attrs.name = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.lineCode'),
            value: attrs.lineCode,
            onChange: val => {
                attrs.lineCode = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.nodes.mrtLineBadge.isTram'),
            isChecked: attrs.isTram,
            onChange: val => {
                attrs.isTram = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            oneLine: true,
        },
        ...((!attrs.isTram
            ? [
                  {
                      type: 'input',
                      label: t('panel.details.nodes.common.num'),
                      value: attrs.lines,
                      onChange: val => {
                          attrs.lines = val;
                          handleAttrsUpdate(id, attrs);
                      },
                      minW: 'full',
                  },
              ]
            : []) as RmgFieldsField[]),
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={MiscNodeType.MRTLineBadge} defaultTheme={defaultMRTLineBadgeAttributes.color} />
            ),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const mrtLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="2" rx="10" ry="10" width="20" height="20" />
        <text x="9" y="17" fill="white" fontSize="14">
            1
        </text>
    </svg>
);

const mrtLineBadge: Node<MRTLineBadgeAttributes> = {
    component: MRTLineBadge,
    icon: mrtLineBadgeIcon,
    defaultAttrs: defaultMRTLineBadgeAttributes,
    attrsComponent: mrtLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.mrtLineBadge.displayName',
        tags: [],
    },
};

export default mrtLineBadge;
