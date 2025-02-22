import React from 'react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { MultilineText } from '../common/multiline-text';
import { InterchangeField, StationAttributesWithInterchange } from '../../panels/details/interchange-field';

export const LINE_HEIGHT = {
    zh: 9,
    en: 6.2,
    top: 6.2 + 1,
    middle: 0,
    bottom: 9 + 1,
};

const SCALE = 2.5;
const ORIGINAL_SIZE = 6.9233;

const ChongqingRTIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultChongqingRTIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultChongqingRTIntStationAttributes.nameOffsetY,
        transfer = defaultChongqingRTIntStationAttributes.transfer,
    } = attrs[StationType.ChongqingRTInt] ?? defaultChongqingRTIntStationAttributes;

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

    const getTextOffset = (oX: NameOffsetX, oY: NameOffsetY) => {
        if (oX === 'left' && oY === 'top') {
            return [0, -names[1].split('\n').length * LINE_HEIGHT[oY] + 3];
        } else if (oX === 'middle' && oY === 'top') {
            return [9, -names[1].split('\n').length * LINE_HEIGHT[oY] - 1];
        } else if (oX === 'right' && oY === 'top') {
            return [18, -names[1].split('\n').length * LINE_HEIGHT[oY] + 3];
        } else if (oX === 'left' && oY === 'bottom') {
            return [0, names[0].split('\n').length * LINE_HEIGHT[oY] + 14];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [9, names[0].split('\n').length * LINE_HEIGHT[oY] + 18];
        } else if (oX === 'right' && oY === 'bottom') {
            return [18, names[0].split('\n').length * LINE_HEIGHT[oY] + 14];
        } else if (oX === 'left' && oY === 'middle') {
            return [-2, 9];
        } else if (oX === 'right' && oY === 'middle') {
            return [20, 9];
        } else return [0, 0];
    };

    const [textX, textY] = getTextOffset(nameOffsetX, nameOffsetY);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <g transform={`translate(${(-ORIGINAL_SIZE * SCALE) / 2},${(-ORIGINAL_SIZE * SCALE) / 2})scale(${SCALE})`}>
                <path
                    style={{
                        fill: 'white',
                        stroke: '#231815',
                        strokeMiterlimit: 22.9,
                        strokeWidth: 0.232,
                    }}
                    d="M3.4614974.2162582c1.7925251,0,3.2455526,1.4530487,3.2455526,3.2453842,0,1.792366-1.4530275,3.2453995-3.2455526,3.2453995C1.6690944,6.7070418.21625,5.2540084.21625,3.4616424.21625,1.6693069,1.6690944.2162582,3.4614974.2162582Z"
                />
                {transfer[0].length <= 2 ? (
                    <>
                        <path
                            style={{
                                fill: transfer[0][0] ? transfer[0][0][2] : 'gray',
                                fillRule: 'evenodd',
                                strokeWidth: 0,
                            }}
                            d="M1.0979448,3.8435012l1.1043701,1.5950012c.0114136.0164948.0303345.0263977.0505371.0263977.0200806,0,.0393677-.0102005.0500488-.0263977l1.1044312-1.5950012c.0125122-.0185013.0131226-.0417023.0014038-.0606995-.012085-.0190048-.0339966-.0295029-.0563965-.0271988h-.7849121v-1.3498993s-.0178223-.7273026.5388794-.9116058c-.4074097.0394058-.7789917.2495041-1.0224609.5786057-.0969238.1385956-.1479492.3043976-.1459961.4735947v1.2084045h-.7854004c-.0223999-.0025024-.0444946.0083008-.0563965.0271988-.0120239.0189972-.0114136.0430984.0016479.0613022l.0002441.0002975Z"
                        />
                        <path
                            style={{
                                fill: transfer[0][1] ? transfer[0][1][2] : 'gray',
                                fillRule: 'evenodd',
                                strokeWidth: 0,
                            }}
                            d="M5.8267046,3.0806991l-1.1043701-1.5956955c-.0112915-.0167007-.0303345-.0266037-.050415-.0266037-.0202026,0-.0388794.0102005-.0498657.0266037l-1.1053467,1.5956955c-.0123901.0181046-.0126953.0419006-.0010986.0603027.012207.0189972.0339966.0294952.0563965.0271988h.7846069v1.3498993s.0187988.7276993-.538269.9113007c.4074097-.0391006.7789917-.2490997,1.0224609-.5782013.0975342-.1400986.1483154-.3050003.1459961-.4733963v-1.2008057h.7852173c.0231934-.0010986.0444946-.0135956.055481-.0330963.0114136-.0198975.0111084-.0439987-.0007935-.0632019Z"
                        />
                    </>
                ) : (
                    <>
                        <path
                            style={{
                                fill: transfer[0][0] ? transfer[0][0][2] : 'gray',
                                fillRule: 'evenodd',
                                strokeWidth: 0,
                            }}
                            d="M2.1100183,1.396341l-.7417603,1.481102c-.0080566.0152969-.0077515.033699.0004883.0487976.0083008.0149994.0235596.0249023.0405884.0263062l1.6477051.1731949c.0187988.0019989.0368652-.0073013.0459595-.0237961.0090332-.0167007.0079346-.0373993-.0028687-.053299l-.3220215-.5876007,1.0109253-.5536041s.5374146-.3120956.9033813.0295029c-.1964722-.2889023-.5062866-.481102-.852356-.5284042-.1449585-.0155945-.2894287.0139008-.4145508.0848007l-.8996619.4923019-.3211022-.5878983c-.010498-.0169983-.0286865-.0278015-.0479126-.0279999-.0192871-.0003052-.0372314.0098953-.046814.0265961"
                        />
                        <path
                            style={{
                                fill: transfer[0][1] ? transfer[0][1][2] : 'gray',
                                fillRule: 'evenodd',
                                strokeWidth: 0,
                            }}
                            d="M2.1465752,5.5567532l1.6500854-.1408997c.017334-.0011063.0325928-.0110016.0411377-.0258026.0084839-.0149994.0090942-.0334015.001709-.0486984l-.7124023-1.4950027c-.0085449-.0169983-.0255127-.0271988-.0442505-.0267029-.0192871.0009003-.0362549.0125046-.0441895.0301056l-.333374.5811005-.9993896-.573204s-.5466309-.2956009-.4465332-.7859955c-.1436768.3182983-.1459961.6828003-.0056763,1.0028992.0614624.1306.1624756.2388992.2888794.3091965l.8948975.5130997-.3336792.5817032c-.0112915.0155945-.0126953.036499-.0036011.0534973.0089722.0167999.0272217.0267029.0458984.024704h.0004883Z"
                        />
                        <path
                            style={{
                                fill: transfer[0][2] ? transfer[0][2][2] : 'gray',
                                fillRule: 'evenodd',
                                strokeWidth: 0,
                            }}
                            d="M5.7657089,3.4463346l-.9017334-1.3894958c-.0092773-.0147018-.0251465-.0234985-.0424805-.0241013-.0169678-.0006027-.0330811.0076981-.0430908.0214996l-.9835815,1.3335037c-.0112915.0149994-.012207.0354004-.0025024.0515976.0095825.0163956.0279541.0256958.0469971.0242996l.6698608.0202026-.0343018,1.1516953s-.0028687.6216049-.4827881.7641983c.3486938-.0233002.6713257-.1929932.8873291-.4676971.0866699-.1167984.1342773-.2565994.1365967-.4000015l.0305786-1.0246964.6697998.0200958c.0202026-.0005951.0386353-.010498.0485229-.0271988.0101929-.0163956.010498-.0371017.0007935-.0539017"
                        />
                    </>
                )}

                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <path
                    id={`stn_core_${id}`}
                    style={{
                        fill: 'white',
                        fillOpacity: '0',
                        stroke: '#231815',
                        strokeMiterlimit: 22.9,
                        strokeWidth: 0.232,
                        strokeOpacity: 0,
                        cursor: 'move',
                    }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    className="removeMe"
                    d="M3.4614974.2162582c1.7925251,0,3.2455526,1.4530487,3.2455526,3.2453842,0,1.792366-1.4530275,3.2453995-3.2455526,3.2453995C1.6690944,6.7070418.21625,5.2540084.21625,3.4616424.21625,1.6693069,1.6690944.2162582,3.4614974.2162582Z"
                />
            </g>
            <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={LINE_HEIGHT.zh}
                    lineHeight={LINE_HEIGHT.zh}
                    grow="up"
                    className="rmp-name__zh"
                    baseOffset={1}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={LINE_HEIGHT.en}
                    lineHeight={LINE_HEIGHT.en}
                    grow="down"
                    className="rmp-name__en"
                    baseOffset={1}
                />
            </g>
        </g>
    );
};

/**
 * ChongqingRTIntStation specific props.
 */
export interface ChongqingRTIntStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultChongqingRTIntStationAttributes: ChongqingRTIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    transfer: [
        [
            [CityCode.Chongqing, 'cq0', '#f2a900', MonoColour.white, '', ''],
            [CityCode.Chongqing, 'cq5', '#00a3e0', MonoColour.white, '', ''],
            [CityCode.Chongqing, 'cq6', '#f67599', MonoColour.white, '', ''],
        ],
    ],
};

const ChongqingRTIntAttrsComponent = (props: AttrsProps<ChongqingRTIntStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: (attrs ?? defaultChongqingRTIntStationAttributes).names[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: (attrs ?? defaultChongqingRTIntStationAttributes).names[1],
            onChange: val => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: (attrs ?? defaultChongqingRTIntStationAttributes).nameOffsetX,
            options: { left: 'left', middle: 'middle', right: 'right' },
            disabledOptions: attrs?.nameOffsetY === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetX = val as NameOffsetX;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetY'),
            value: (attrs ?? defaultChongqingRTIntStationAttributes).nameOffsetY,
            options: { top: 'top', middle: 'middle', bottom: 'bottom' },
            disabledOptions: attrs?.nameOffsetX === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('panel.details.stations.interchange.title'),
            component: (
                <InterchangeField
                    stationType={StationType.ChongqingRTInt}
                    defaultAttrs={defaultChongqingRTIntStationAttributes}
                    maximumTransfers={[3, 0, 0]}
                />
            ),
        },
    ];
    return <RmgFields fields={fields} />;
};

const chongqingRTIntStationIcon = (
    <div style={{ padding: 5 }}>
        <svg viewBox="0 0 7 7" height={30} width={30} focusable={false}>
            <path
                style={{
                    fill: 'none',
                    stroke: '#231815',
                    strokeMiterlimit: 22.9,
                    strokeWidth: 0.232,
                }}
                d="M3.4614974.2162582c1.7925251,0,3.2455526,1.4530487,3.2455526,3.2453842,0,1.792366-1.4530275,3.2453995-3.2455526,3.2453995C1.6690944,6.7070418.21625,5.2540084.21625,3.4616424.21625,1.6693069,1.6690944.2162582,3.4614974.2162582Z"
            />
            <path
                style={{ fill: '#231815', fillRule: 'evenodd', strokeWidth: 0 }}
                d="M1.0979448,3.8435012l1.1043701,1.5950012c.0114136.0164948.0303345.0263977.0505371.0263977.0200806,0,.0393677-.0102005.0500488-.0263977l1.1044312-1.5950012c.0125122-.0185013.0131226-.0417023.0014038-.0606995-.012085-.0190048-.0339966-.0295029-.0563965-.0271988h-.7849121v-1.3498993s-.0178223-.7273026.5388794-.9116058c-.4074097.0394058-.7789917.2495041-1.0224609.5786057-.0969238.1385956-.1479492.3043976-.1459961.4735947v1.2084045h-.7854004c-.0223999-.0025024-.0444946.0083008-.0563965.0271988-.0120239.0189972-.0114136.0430984.0016479.0613022l.0002441.0002975Z"
            />
            <path
                style={{ fill: '#231815', fillRule: 'evenodd', strokeWidth: 0 }}
                d="M5.8267046,3.0806991l-1.1043701-1.5956955c-.0112915-.0167007-.0303345-.0266037-.050415-.0266037-.0202026,0-.0388794.0102005-.0498657.0266037l-1.1053467,1.5956955c-.0123901.0181046-.0126953.0419006-.0010986.0603027.012207.0189972.0339966.0294952.0563965.0271988h.7846069v1.3498993s.0187988.7276993-.538269.9113007c.4074097-.0391006.7789917-.2490997,1.0224609-.5782013.0975342-.1400986.1483154-.3050003.1459961-.4733963v-1.2008057h.7852173c.0231934-.0010986.0444946-.0135956.055481-.0330963.0114136-.0198975.0111084-.0439987-.0007935-.0632019Z"
            />
        </svg>
    </div>
);

const chongqingRTIntStation: Station<ChongqingRTIntStationAttributes> = {
    component: ChongqingRTIntStation,
    icon: chongqingRTIntStationIcon,
    defaultAttrs: defaultChongqingRTIntStationAttributes,
    attrsComponent: ChongqingRTIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.chongqingRTInt.displayName',
        cities: [CityCode.Chongqing],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default chongqingRTIntStation;
