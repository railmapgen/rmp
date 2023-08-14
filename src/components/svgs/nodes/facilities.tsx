import React from 'react';
import { Node, NodeComponentProps } from '../../../constants/nodes';

/**
 * Facilities type, note that the value should match the filename under public/images/facilities.
 */
enum FacilitiesType {
    Airport = 'airport',
    Maglev = 'maglev',
    Disney = 'disney',
    Railway = 'railway',
    HSR = 'hsr',
    AirportHK = 'airport_hk',
    DisneyHK = 'disney_hk',
    NgongPing360 = 'ngong_ping_360',
    Tiananmen = 'tiananmen',
    AirportBJ = 'airport_bj',
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

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x - bBox.width / 2}, ${y - bBox.height / 2})`}>
                <image
                    ref={imgEl}
                    href={`/images/facilities/${type}.svg`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
        ),
        [id, x, y, type, bBox, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * Facilities specific props.
 */
export interface FacilitiesAttributes {
    type: FacilitiesType;
}

const defaultFacilitiesAttributes: FacilitiesAttributes = {
    type: FacilitiesType.Tiananmen,
};

const FacilitiesFields = [
    {
        type: 'select',
        label: 'panel.details.nodes.facilities.type',
        value: (attrs?: FacilitiesAttributes) => (attrs ?? defaultFacilitiesAttributes).type,
        options: {
            [FacilitiesType.Airport]: 'Airport',
            [FacilitiesType.Maglev]: 'Maglev',
            [FacilitiesType.Disney]: 'Disney',
            [FacilitiesType.Railway]: 'Railway',
            [FacilitiesType.HSR]: 'HSR',
            [FacilitiesType.AirportHK]: 'Airport Hongkong',
            [FacilitiesType.DisneyHK]: 'Disney Hongkong',
            [FacilitiesType.NgongPing360]: 'Ngong Ping 360',
            [FacilitiesType.Tiananmen]: 'Tiananmen',
            [FacilitiesType.AirportBJ]: 'Airport Beijing',
        },
        onChange: (val: string | number, attrs_: FacilitiesAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultFacilitiesAttributes;
            // set value
            attrs.type = val as FacilitiesType;
            // return modified attrs
            return attrs;
        },
    },
];

const FacilitiesIcon = (
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
    icon: FacilitiesIcon,
    defaultAttrs: defaultFacilitiesAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: FacilitiesFields,
    metadata: {
        displayName: 'panel.details.nodes.facilities.displayName',
        tags: [],
    },
};

export default facilities;
