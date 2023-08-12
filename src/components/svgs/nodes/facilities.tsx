import React from 'react';
import { Node, NodeComponentProps } from '../../../constants/nodes';

const Facilities = (props: NodeComponentProps<FacilitiesAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { type = defaultFacilitiesAttributes.type } = attrs ?? defaultFacilitiesAttributes;

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
            <g id={id} transform={`translate(${x}, ${y})`}>
                {type === 'airport' && (
                    <g id="airport" transform="translate(-12.5,0)">
                        <circle fill="#828282" cx="12.5" cy="12.5" r="11.5" />
                        <line
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="2.167"
                            strokeLinecap="round"
                            strokeMiterlimit="10"
                            x1="12.5"
                            y1="18.7"
                            x2="12.5"
                            y2="3.7"
                        />
                        <polyline fill="#FFFFFF" points="11.7,9.3 3.3,14.3 3.3,16.7 11.7,13.7 " />
                        <polyline fill="#FFFFFF" points="13.3,9.3 21.7,14.3 21.7,16.7 13.3,13.7 " />
                        <polyline
                            fill="#FFFFFF"
                            points="11.7,18.3 9.7,19.7 9.7,21.7 12.3,20.7 12.7,20.7 15.3,21.7 15.3,19.7 13.3,18.3 "
                        />
                        <circle
                            fill="#828282"
                            fillOpacity="0"
                            cx="12.5"
                            cy="12.5"
                            r="11.5"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            style={{ cursor: 'move' }}
                        />
                    </g>
                )}
                {type === 'disney' && (
                    <g id="disney" transform="scale(0.426)">
                        <circle cx="0" cy="29.33899" r="29.33899" fill="grey" />
                        <path
                            fill="white"
                            d="M45.6152,7.85015a9.80248,9.80248,0,0,0-9.79907,9.801,9.70059,9.70059,0,0,0,.342,2.582c.002.026.002.055.002.093a.31815.31815,0,0,1-.31494.318.67741.67741,0,0,1-.12806-.02,15.71521,15.71521,0,0,0-13.498,0,.61.61,0,0,1-.122.02.31841.31841,0,0,1-.322-.318v-.067a9.62553,9.62553,0,0,0,.35608-2.608,9.803,9.803,0,1,0-9.797,9.8,10.10364,10.10364,0,0,0,2.308-.271h.05493a.31113.31113,0,0,1,.31409.318.32433.32433,0,0,1-.019.12,15.72588,15.72588,0,1,0,29.703,7.216,15.83676,15.83676,0,0,0-1.746-7.23.18417.18417,0,0,1-.0271-.106.31612.31612,0,0,1,.32007-.318h.057a10.15953,10.15953,0,0,0,2.316.271,9.80051,9.80051,0,0,0,0-19.601"
                            transform="translate(-28.9697 0.13398)"
                        />
                        <circle
                            cx="0"
                            cy="29.33899"
                            r="29.33899"
                            fill="grey"
                            fillOpacity="0"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            style={{ cursor: 'move' }}
                        />
                    </g>
                )}
                {type === 'maglev' && (
                    <g id="maglev" transform="translate(-12.5,0)">
                        <path
                            fill="#10716F"
                            d="M23.8,22.4c0,0.8-0.6,1.4-1.4,1.4H2.6c-0.8,0-1.4-0.6-1.4-1.4V2.6c0-0.8,0.6-1.4,1.4-1.4h19.8
		c0.8,0,1.4,0.6,1.4,1.4V22.4L23.8,22.4z"
                        />
                        <path
                            fill="#FFFFFF"
                            d="M12.5,2.8l-1,1.7L7.2,5C5.9,5.1,4.8,6.2,4.8,7.6v6.2c0,0.9,0.7,1.7,1.7,1.7h12c0.9,0,1.7-0.7,1.7-1.7V7.6
	c0-1.4-1-2.5-2.4-2.7l-4.3-0.4"
                        />
                        <polyline fill="#10716F" points="13.2,8.8 13.2,11.8 18,11.8 18,8.5 13.2,8.5 " />
                        <polyline fill="#10716F" points="7,8.8 7,11.8 11.8,11.8 11.8,8.5 7,8.5 " />
                        <path
                            fill="#FFFFFF"
                            d="M4.8,15.3v4c0,1.1,0.7,2,1.8,2h2v-1.7H6.5v-2.3h12v2.3h-2.2v1.7h2c1.1,0,1.8-0.7,1.8-1.8v-4.3v0.2
	c-0.3,0.4-0.8,0.7-1.3,0.7H6.2C5.7,16,5.2,15.8,4.8,15.3L4.8,15.3z"
                        />
                        {/* Below is an overlay element that has all event hooks but can not be seen. */}
                        <path
                            d="M23.8,22.4c0,0.8-0.6,1.4-1.4,1.4H2.6c-0.8,0-1.4-0.6-1.4-1.4V2.6c0-0.8,0.6-1.4,1.4-1.4h19.8
		c0.8,0,1.4,0.6,1.4,1.4V22.4L23.8,22.4z"
                            fill="#10716F"
                            fillOpacity="0"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            style={{ cursor: 'move' }}
                        />
                    </g>
                )}
                {type === 'railway' && (
                    <g id="railway" transform="translate(-12.5,0)">
                        <circle fill="#807F80" cx="12.5" cy="12.5" r="11.5" />
                        <line fill="none" x1="10.8" y1="3.8" x2="10.8" y2="4.8" />
                        <polyline fill="#FFFFFF" points="10.8,5 10.8,3.8 14.2,3.8 14.2,5 " />
                        <path
                            fill="#FFFFFF"
                            d="M13.8,14.1h-2.7c-0.8,0-1.5-0.7-1.5-1.5v-0.2c0-0.8,0.7-1.5,1.5-1.5h2.7c0.8,0,1.5,0.7,1.5,1.5v0.2
	C15.3,13.4,14.7,14.1,13.8,14.1z"
                        />
                        <circle
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            strokeMiterlimit="10"
                            cx="12.5"
                            cy="12.5"
                            r="6.7"
                        />
                        <polyline fill="#807F80" points="10.2,17.3 8.8,20 12.5,21 16.2,19.7 14.8,17.3 " />
                        <path
                            fill="#FFFFFF"
                            d="M13.1,13.8h-1.5v5.6c0,0.2-0.1,0.3-0.3,0.3l-4.1,0.9v1.2h10.3v-1.2l-4.1-0.9c-0.2,0-0.3-0.2-0.3-0.3L13.1,13.8"
                        />
                        <circle
                            cx="12.5"
                            cy="12.5"
                            r="11.5"
                            fill="#807F80"
                            fillOpacity="0"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            style={{ cursor: 'move' }}
                        />
                    </g>
                )}
                {type === 'hsr' && (
                    <>
                        <clipPath id="hsr-clip-path" transform="translate(-0.00057 0.01643)">
                            <path
                                fill="none"
                                d="M5.1606.89861a3.67176,3.67176,0,0,0-3.676,3.667v48.966a3.67842,3.67842,0,0,0,3.676,3.692h48.443a3.67892,3.67892,0,0,0,3.678-3.692V4.5656a3.67227,3.67227,0,0,0-3.678-3.667Z"
                            />
                        </clipPath>
                        <g id="hsr" transform="scale(0.33)">
                            <rect x={-29.33899} width={58.67798} height={58.67798} />
                            <g clipPath="url(#hsr-clip-path)" transform="translate(-29.33899,0)">
                                <rect
                                    x={-3.25242}
                                    y={24.74141}
                                    width={61.75879}
                                    height={0.98008}
                                    transform="translate(-8.93747 17.31321) rotate(-30.16134)"
                                    fill="white"
                                />
                                <path
                                    d="M5.77169,48.97289c-2.17407-3.89294,2.56994-10.525,4.85-13.724l.173-.248a83.00826,83.00826,0,0,1,7.39294-9.285,97.384,97.384,0,0,1,11.082-9.958c7.051-6.045,15.832-5.876,16.447-5.894l11.785-.957.276,17.42-11.5271,10.586c-.36.39405-5.553,5.863-18.10193,11.035-6.752,2.783-11.877,4.146-15.66,4.146-3.301,0-5.561-1.049-6.71692-3.121"
                                    transform="translate(-0.00057 0.01643)"
                                    fill="white"
                                />
                                <polygon
                                    points="57.453 29.614 32.426 58.31 35.582 58.509 57.584 30.433 57.453 29.614"
                                    fill="white"
                                />
                                <path
                                    d="M49.04708,11.61364a.94277.94277,0,0,0-.17407-.227c-.752-.93695-2.988-1.259-5.933-.793a25.98382,25.98382,0,0,0-9.99695,3.032A98.52916,98.52916,0,0,0,20.723,23.69768c-3.1759,3.487-4.645,6.388-3.62292,7.584,1.84,2.166,13.7539.716,22.00793-6.066,9.035-7.42,10.718-11.577,9.93909-13.602"
                                    transform="translate(-0.00057 0.01643)"
                                />
                                <path
                                    d="M34.65255,13.81182c5.65991-2.842,11.28088-2.856,12.1499-1.213.88306,1.652-2.99792,5.303-8.656,8.128-5.648,2.837-10.9469,3.805-11.81994,2.15-.873-1.641,2.668-6.237,8.326-9.065"
                                    transform="translate(-0.00057 0.01643)"
                                    fill="white"
                                />
                                <path
                                    d="M58.10958,25.03454c-16.832,20.708-40.7301,26.038-40.7301,26.038,11-6.73,12.769-8.111,18.968-18.01,8.364-13.351,21.77808-21.549,21.912-21.63,0,0-.068,13.5-.1499,13.602"
                                    transform="translate(-0.00057 0.01643)"
                                />
                                <path
                                    d="M27.1877,26.69561l9.705-2.814a6.22768,6.22768,0,0,1-1.994,2.759,25.57277,25.57277,0,0,1-6.697,3.405,11.78221,11.78221,0,0,1-5.5.783Z"
                                    transform="translate(-0.00057 0.01643)"
                                    fill="white"
                                />
                                <path
                                    d="M19.59005,25.97692a18.37656,18.37656,0,0,1,3.891-3.976,6.66452,6.66452,0,0,0-.30908,2.213l-4.391,4.829a6.18212,6.18212,0,0,1,.80908-3.066"
                                    transform="translate(-0.00057 0.01643)"
                                    fill="white"
                                />
                                <polygon
                                    points="23.156 58.311 57.463 26.746 57.396 25.857 21.582 58.607 23.156 58.311"
                                    fill="white"
                                />
                                <path
                                    d="M60.15645,12.35973a68.6782,68.6782,0,0,0-12.602,9.542c-8.15,7.745-12.109,15.259-9.855,16.091,2.24793.816,10.678-4.782,18.83594-12.543,1.828-1.74,3.48-3.424,4.926-5.024Z"
                                    transform="translate(-0.00057 0.01643)"
                                    fill="white"
                                />
                                <path
                                    d="M63.07638,11.82653a40.86955,40.86955,0,0,0-10,7.096c-5.90406,5.437-9.48609,11.105-7.848,11.742,1.657.631,8.28894-3.955,14.188-9.401a61.76591,61.76591,0,0,0,4.61694-4.705Z"
                                    transform="translate(-0.00057 0.01643)"
                                />
                                <path
                                    d="M12.67989,42.93969a9.87,9.87,0,0,0-5.754-1.895c-.113.22-.223.439-.33008.662a9.45046,9.45046,0,0,1,5.69507,1.749,6.27885,6.27885,0,0,1,2.61,6.305,10.16524,10.16524,0,0,1-.598,2.228c.238-.023.481-.053.725-.087.78308-2.249,1.394-6.184-2.3479-8.962"
                                    transform="translate(-0.00057 0.01643)"
                                />
                            </g>
                            <rect
                                x={-29.33899}
                                width={58.67798}
                                height={58.67798}
                                fillOpacity="0"
                                onPointerDown={onPointerDown}
                                onPointerMove={onPointerMove}
                                onPointerUp={onPointerUp}
                                style={{ cursor: 'move' }}
                            />
                        </g>
                    </>
                )}
                {type === 'airport_hk' && (
                    <g id="airport_hk" transform="scale(0.33)">
                        <rect x="-29.35" fill="#012639" width="58.7" height="58.7" />
                        <path
                            id="airport"
                            d="M28.9769,6.60134c1.711.013,3.111,2.53205,3.111,4.241v10.337s17.106,15.435,17.358,15.666a1.145,1.145,0,0,1,.488,1.152v2.833c0,.651-.451.61-.695.467-.334-.119-17.151-8.863-17.151-8.863-.004,1.458-.797,9.006-1.326,13.304,0,0,4.61,2.457,4.699,2.521.334.268.352.359.352.852v2.001c0,.477-.352.428-.51.324-.183-.062-5.693-1.921-5.693-1.921a2.56018,2.56018,0,0,0-.633-.127,2.31654,2.31654,0,0,0-.666.127s-5.477,1.859-5.672,1.921c-.185.104-.523.153-.523-.324v-2.001c0-.493.029-.584.367-.852.086-.064,4.678-2.521,4.678-2.521-.524-4.298-1.307-11.846-1.325-13.304,0,0-16.822,8.744-17.148,8.863-.217.143-.69.184-.69-.467v-2.833a1.16206,1.16206,0,0,1,.473-1.152c.276-.231,17.365-15.666,17.365-15.666v-10.337c0-1.709,1.403-4.228,3.14105-4.241"
                            transform="translate(-28.9697,0.14347)"
                            fill="white"
                        />
                        <rect
                            fill="#012639"
                            x="-29.35"
                            width="58.7"
                            height="58.7"
                            fillOpacity="0"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            style={{ cursor: 'move' }}
                        />
                    </g>
                )}
                {type === 'disney_hk' && (
                    <g id="disney_hk" transform="scale(0.33)">
                        <rect x="-29.35" fill="#012639" width="58.7" height="58.7" />
                        <path
                            fill="white"
                            d="M45.6152,7.85015a9.80248,9.80248,0,0,0-9.79907,9.801,9.70059,9.70059,0,0,0,.342,2.582c.002.026.002.055.002.093a.31815.31815,0,0,1-.31494.318.67741.67741,0,0,1-.12806-.02,15.71521,15.71521,0,0,0-13.498,0,.61.61,0,0,1-.122.02.31841.31841,0,0,1-.322-.318v-.067a9.62553,9.62553,0,0,0,.35608-2.608,9.803,9.803,0,1,0-9.797,9.8,10.10364,10.10364,0,0,0,2.308-.271h.05493a.31113.31113,0,0,1,.31409.318.32433.32433,0,0,1-.019.12,15.72588,15.72588,0,1,0,29.703,7.216,15.83676,15.83676,0,0,0-1.746-7.23.18417.18417,0,0,1-.0271-.106.31612.31612,0,0,1,.32007-.318h.057a10.15953,10.15953,0,0,0,2.316.271,9.80051,9.80051,0,0,0,0-19.601"
                            transform="translate(-28.9697 0.13398)"
                        />
                        <rect
                            fill="#012639"
                            x="-29.35"
                            width="58.7"
                            height="58.7"
                            fillOpacity="0"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            style={{ cursor: 'move' }}
                        />
                    </g>
                )}
                {type === 'ngong_ping_360' && (
                    <>
                        <g id="ngong_ping_360" transform="translate(-179,-161)scale(0.33)">
                            <rect x="270.1" y="270.4" fill="#012639" width="58.7" height="58.7" />
                            <polygon fill="#FFFFFF" points="277.2,274.7 297.4,280.1 297.4,278.6 277.2,273.2 " />
                            <polygon fill="#FFFFFF" points="301.4,281.2 321.7,286.6 321.7,285.1 301.4,279.7 " />
                            <path
                                fill="#FFFFFF"
                                d="M312.4,326c0,0.1-0.2,0.2-0.3,0.2h-1.1c-0.2,0-0.3-0.1-0.3-0.3c0,0,0-0.1,0-0.1l0.8-2.4h-23.9l0.8,2.4
	c0,0,0,0.1,0,0.1c0,0.2-0.1,0.3-0.3,0.3h-1.1c-0.1,0-0.3-0.1-0.3-0.2l-3.8-13.9c-1-3.6-0.3-8.2,0.4-10.5l4.7-14.9
	c0.2-0.8,0.5-0.9,0.8-0.9h1.2l-0.4,1.2h8.7v-10.2c0-0.2,0.2-0.4,0.4-0.4h1.8c0.2,0,0.4,0.2,0.4,0.4v10.2h8.7l-0.4-1.2h1.2
	c0.3,0,0.6,0.1,0.8,0.9l4.7,14.9c0.7,2.3,1.4,6.8,0.4,10.5L312.4,326z"
                            />
                            <path
                                fill="#012639"
                                d="M288.4,289.9v19c0,0.3-0.2,0.5-0.5,0.5h-4c-0.3-3.2,0.4-6,1-8.3L288.4,289.9z"
                            />
                            <path
                                fill="#012639"
                                d="M310.5,289.9v19c0,0.3,0.2,0.5,0.5,0.5h4c0.3-3.2-0.4-6-1-8.3L310.5,289.9z"
                            />
                            <path
                                fill="#012639"
                                d="M290.4,289.9h7.7c0.3,0,0.5,0.2,0.5,0.5v18.5c0,0.3-0.2,0.5-0.5,0.5h-7.7c-0.3,0-0.5-0.2-0.5-0.5v-18.5
	C289.9,290.2,290.2,289.9,290.4,289.9"
                            />
                            <path
                                fill="#012639"
                                d="M300.7,289.9h7.8c0.3,0,0.5,0.2,0.5,0.5v18.5c0,0.3-0.2,0.5-0.5,0.5h-7.8c-0.3,0-0.5-0.2-0.5-0.5v-18.5
	C300.2,290.2,300.4,289.9,300.7,289.9"
                            />
                            <rect
                                x="270.1"
                                y="270.4"
                                width="58.7"
                                height="58.7"
                                fillOpacity="0"
                                onPointerDown={onPointerDown}
                                onPointerMove={onPointerMove}
                                onPointerUp={onPointerUp}
                                style={{ cursor: 'move' }}
                            />
                        </g>
                    </>
                )}
            </g>
        ),
        [id, x, y, type, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * Facilities specific props.
 */
export interface FacilitiesAttributes {
    type: 'airport' | 'maglev' | 'disney' | 'railway' | 'hsr' | 'ngong_ping_360' | 'airport_hk' | 'disney_hk';
}

const defaultFacilitiesAttributes: FacilitiesAttributes = {
    type: 'airport',
};

const FacilitiesFields = [
    {
        type: 'select',
        label: 'panel.details.nodes.facilities.type',
        value: (attrs?: FacilitiesAttributes) => (attrs ?? defaultFacilitiesAttributes).type,
        options: {
            airport: 'airport',
            maglev: 'maglev',
            disney: 'disney',
            railway: 'railway',
            hsr: 'hsr',
            airport_hk: 'airport Hongkong',
            disney_hk: 'disney Hongkong',
            ngong_ping_360: 'Ngong Ping 360',
        },
        onChange: (val: string | number, attrs_: FacilitiesAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultFacilitiesAttributes;
            // set value
            attrs.type = val as
                | 'airport'
                | 'maglev'
                | 'disney'
                | 'railway'
                | 'hsr'
                | 'ngong_ping_360'
                | 'airport_hk'
                | 'disney_hk';
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
