import { RmgFields } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { TaipeiGondolaSymbol } from '../common/taipei-gondola-symbol';

const TaipeiMaokongGondolaBadge = (props: NodeComponentProps<TaipeiMaokongGondolaBadgeAttributes>) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { color = defaultAttrs.color } = attrs ?? defaultAttrs;
    return (
        <g
            onPointerDown={e => handlePointerDown(id, e)}
            onPointerMove={e => handlePointerMove(id, e)}
            onPointerUp={e => handlePointerUp(id, e)}
            style={{ cursor: 'move' }}
        >
            <TaipeiGondolaSymbol color={color[2]} width={14.2} height={15.5} />
        </g>
    );
};

export interface TaipeiMaokongGondolaBadgeAttributes extends ColorAttribute {}

const defaultAttrs: TaipeiMaokongGondolaBadgeAttributes = {
    color: [CityCode.Taipei, 'maokong', '#00A7D3', MonoColour.white],
};

const AttrsComponent = (_props: AttrsProps<TaipeiMaokongGondolaBadgeAttributes>) => {
    const { t } = useTranslation();
    return (
        <RmgFields
            fields={[
                {
                    type: 'custom',
                    label: t('color'),
                    component: (
                        <ColorField type={MiscNodeType.TaipeiMaokongGondolaBadge} defaultTheme={defaultAttrs.color} />
                    ),
                },
            ]}
        />
    );
};

const taipeiMaokongGondolaBadge: Node<TaipeiMaokongGondolaBadgeAttributes> = {
    component: TaipeiMaokongGondolaBadge,
    defaultAttrs,
    attrsComponent: AttrsComponent,
    icon: (
        <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
            <g transform="translate(12, 12)">
                <TaipeiGondolaSymbol color="currentColor" width={14.2} height={15.5} />
            </g>
        </svg>
    ),
    metadata: { displayName: 'panel.details.nodes.taipeiMaokongGondolaBadge.displayName', tags: [] },
};

export default taipeiMaokongGondolaBadge;
