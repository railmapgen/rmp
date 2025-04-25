import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Node, NodeComponentProps } from '../../../constants/nodes';
import { AttrsProps } from '../../../constants/constants';

/**
 * Facilities type
 *
 * Note that the value should match the filename without the extension under public/images/facilities.
 *
 * Note changing the value needs both filename update and save version (type) update.
 * See change of Qingdao in #809 and fix in #862.
 */
export enum FacilitiesType {
    Airport = 'airport',
    Airport2024 = 'airport_2024',
    Maglev = 'maglev',
    Disney = 'disney',
    Railway = 'railway',
    Railway2024 = 'railway_2024',
    HSR = 'hsr',
    AirportHK = 'airport_hk',
    DisneyHK = 'disney_hk',
    NgongPing360 = 'ngong_ping_360',
    Tiananmen = 'tiananmen',
    AirportBJ = 'airport_bj',
    BusTerminalSuzhou = 'bus_terminal_suzhou',
    RailwaySuzhou = 'railway_suzhou',
    BusInterchange = 'bus_interchange',
    AirportSG = 'airport_sg',
    CruiseCentre = 'cruise_centre',
    SentosaExpress = 'sentosa_express',
    CableCar = 'cable_car',
    Merlion = 'merlion',
    MarinaBaySands = 'marina_bay_sands',
    GardensByTheBay = 'gardens_by_the_bay',
    SingaporeFlyer = 'singapore_flyer',
    Esplanade = 'esplanade',
    AirportQingdao = 'airport_qingdao',
    CoachStationQingdao = 'coach_station_qingdao',
    CruiseTerminalQingdao = 'cruise_terminal_qingdao',
    RailwayQingdao = 'railway_qingdao',
    TramQingdao = 'tram_qingdao',
    AirportGuangzhou = 'airport_guangzhou',
    RailwayGuangzhou = 'railway_guangzhou',
    IntercityGuangzhou = 'intercity_guangzhou',
    RiverCraftLondon = 'river_craft',
    AirportLondon = 'airport_london',
    CoachStationLondon = 'coach_station_london',
    AirportChongqing = 'airport_chongqing',
    RailwayChongqing = 'railway_chongqing',
    CoachStationChongqing = 'coach_station_chongqing',
    BusStationChongqing = 'bus_station_chongqing',
    ShippingStationChongqing = 'shipping_station_chongqing',
    AirportChengdu = 'airport_chengdu',
    RailwayChengdu = 'railway_chengdu',
    RailwayTaiwan = 'railway_taiwan',
    HSRTaiwan = 'hsr_taiwan',
}

const Facilities = (props: NodeComponentProps<FacilitiesAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { type = defaultFacilitiesAttributes.type } = attrs ?? defaultFacilitiesAttributes;

    const imgEl = React.useRef<SVGImageElement | null>(null);
    const [bBox, setBBox] = React.useState({ width: 25, height: 25 } as DOMRect);
    React.useEffect(() => setBBox(imgEl.current!.getBBox()), [type, setBBox, imgEl]);

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

    return (
        <g
            id={id}
            transform={`translate(${x - bBox.width / 2}, ${y - bBox.height / 2})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <image
                ref={imgEl}
                href={import.meta.env.BASE_URL + `images/facilities/${type}.svg`}
                onLoad={() => setBBox(imgEl.current!.getBBox())}
            />
        </g>
    );
};

/**
 * Facilities specific props.
 */
export interface FacilitiesAttributes {
    type: FacilitiesType;
}

const defaultFacilitiesAttributes: FacilitiesAttributes = {
    type: FacilitiesType.Airport,
};

const attrsComponent = (props: AttrsProps<FacilitiesAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const field: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('panel.details.nodes.facilities.type'),
            value: attrs.type,
            options: {
                [FacilitiesType.Airport]: t('panel.details.nodes.facilities.airport'),
                [FacilitiesType.Airport2024]: t('panel.details.nodes.facilities.airport_2024'),
                [FacilitiesType.Maglev]: t('panel.details.nodes.facilities.maglev'),
                [FacilitiesType.Disney]: t('panel.details.nodes.facilities.disney'),
                [FacilitiesType.Railway]: t('panel.details.nodes.facilities.railway'),
                [FacilitiesType.Railway2024]: t('panel.details.nodes.facilities.railway_2024'),
                [FacilitiesType.HSR]: t('panel.details.nodes.facilities.hsr'),
                [FacilitiesType.AirportHK]: t('panel.details.nodes.facilities.airport_hk'),
                [FacilitiesType.DisneyHK]: t('panel.details.nodes.facilities.disney_hk'),
                [FacilitiesType.NgongPing360]: t('panel.details.nodes.facilities.ngong_ping_360'),
                [FacilitiesType.Tiananmen]: t('panel.details.nodes.facilities.tiananmen'),
                [FacilitiesType.AirportBJ]: t('panel.details.nodes.facilities.airport_bj'),
                [FacilitiesType.BusTerminalSuzhou]: t('panel.details.nodes.facilities.bus_terminal_suzhou'),
                [FacilitiesType.RailwaySuzhou]: t('panel.details.nodes.facilities.railway_suzhou'),
                [FacilitiesType.BusInterchange]: t('panel.details.nodes.facilities.bus_interchange'),
                [FacilitiesType.AirportSG]: t('panel.details.nodes.facilities.airport_sg'),
                [FacilitiesType.CruiseCentre]: t('panel.details.nodes.facilities.cruise_centre'),
                [FacilitiesType.SentosaExpress]: t('panel.details.nodes.facilities.sentosa_express'),
                [FacilitiesType.CableCar]: t('panel.details.nodes.facilities.cable_car'),
                [FacilitiesType.Merlion]: t('panel.details.nodes.facilities.merlion'),
                [FacilitiesType.MarinaBaySands]: t('panel.details.nodes.facilities.marina_bay_sands'),
                [FacilitiesType.GardensByTheBay]: t('panel.details.nodes.facilities.gardens_by_the_bay'),
                [FacilitiesType.SingaporeFlyer]: t('panel.details.nodes.facilities.singapore_flyer'),
                [FacilitiesType.Esplanade]: t('panel.details.nodes.facilities.esplanade'),
                [FacilitiesType.AirportQingdao]: t('panel.details.nodes.facilities.airport_qingdao'),
                [FacilitiesType.RailwayQingdao]: t('panel.details.nodes.facilities.railway_qingdao'),
                [FacilitiesType.CoachStationQingdao]: t('panel.details.nodes.facilities.coach_station_qingdao'),
                [FacilitiesType.CruiseTerminalQingdao]: t('panel.details.nodes.facilities.cruise_terminal_qingdao'),
                [FacilitiesType.TramQingdao]: t('panel.details.nodes.facilities.tram_qingdao'),
                [FacilitiesType.AirportGuangzhou]: t('panel.details.nodes.facilities.airport_guangzhou'),
                [FacilitiesType.RailwayGuangzhou]: t('panel.details.nodes.facilities.railway_guangzhou'),
                [FacilitiesType.IntercityGuangzhou]: t('panel.details.nodes.facilities.intercity_guangzhou'),
                [FacilitiesType.RiverCraftLondon]: t('panel.details.nodes.facilities.river_craft'),
                [FacilitiesType.AirportLondon]: t('panel.details.nodes.facilities.airport_london'),
                [FacilitiesType.CoachStationLondon]: t('panel.details.nodes.facilities.coach_station_london'),
                [FacilitiesType.AirportChongqing]: t('panel.details.nodes.facilities.airport_chongqing'),
                [FacilitiesType.RailwayChongqing]: t('panel.details.nodes.facilities.railway_chongqing'),
                [FacilitiesType.CoachStationChongqing]: t('panel.details.nodes.facilities.coach_station_chongqing'),
                [FacilitiesType.BusStationChongqing]: t('panel.details.nodes.facilities.bus_station_chongqing'),
                [FacilitiesType.ShippingStationChongqing]: t(
                    'panel.details.nodes.facilities.shipping_station_chongqing'
                ),
                [FacilitiesType.AirportChengdu]: t('panel.details.nodes.facilities.airport_chengdu'),
                [FacilitiesType.RailwayChengdu]: t('panel.details.nodes.facilities.railway_chengdu'),
                [FacilitiesType.RailwayTaiwan]: t('panel.details.nodes.facilities.railway_taiwan'),
                [FacilitiesType.HSRTaiwan]: t('panel.details.nodes.facilities.hsr_taiwan'),
            },
            onChange: val => {
                attrs.type = val as FacilitiesType;
                handleAttrsUpdate(id, attrs);
            },
        },
    ];

    return <RmgFields fields={field} minW="full" />;
};

const facilitiesIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <g transform="translate(12, 0)scale(0.4)">
            <circle cx="0" cy="29.33899" r="29.33899" fill="currentColor" />
            <path
                id="airport"
                d="M28.9769,6.60134c1.711.013,3.111,2.53205,3.111,4.241v10.337s17.106,15.435,17.358,15.666a1.145,1.145,0,0,1,.488,1.152v2.833c0,.651-.451.61-.695.467-.334-.119-17.151-8.863-17.151-8.863-.004,1.458-.797,9.006-1.326,13.304,0,0,4.61,2.457,4.699,2.521.334.268.352.359.352.852v2.001c0,.477-.352.428-.51.324-.183-.062-5.693-1.921-5.693-1.921a2.56018,2.56018,0,0,0-.633-.127,2.31654,2.31654,0,0,0-.666.127s-5.477,1.859-5.672,1.921c-.185.104-.523.153-.523-.324v-2.001c0-.493.029-.584.367-.852.086-.064,4.678-2.521,4.678-2.521-.524-4.298-1.307-11.846-1.325-13.304,0,0-16.822,8.744-17.148,8.863-.217.143-.69.184-.69-.467v-2.833a1.16206,1.16206,0,0,1,.473-1.152c.276-.231,17.365-15.666,17.365-15.666v-10.337c0-1.709,1.403-4.228,3.14105-4.241"
                transform="translate(-28.9697,0.14347)"
                fill="white"
            />
        </g>
    </svg>
);

const facilities: Node<FacilitiesAttributes> = {
    component: Facilities,
    icon: facilitiesIcon,
    defaultAttrs: defaultFacilitiesAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.facilities.displayName',
        tags: [],
    },
};

export default facilities;
