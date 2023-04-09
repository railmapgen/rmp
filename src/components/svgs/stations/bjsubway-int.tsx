import React from 'react';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { CanvasType, CategoriesType } from '../../../constants/constants';
import {
    defaultStationAttributes,
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { MultilineText, NAME_DY } from '../common/multiline-text';
import { LINE_HEIGHT } from './bjsubway-basic';

const PATH_ARROW =
    'M 11.788437 20 L 11.791121 19.15914 L 11.895754 19.139772 C 11.9533 19.12912 12.046264 19.109642 12.102339 19.096485 C 12.158414 19.083328 12.246507 19.060778 12.298101 19.046371 C 12.349695 19.031967 12.434475 19.006149 12.486499 18.988998 C 12.538524 18.971848 12.630527 18.939106 12.690952 18.916237 C 12.751377 18.893368 12.850254 18.8528 12.910679 18.826088 C 12.971104 18.799376 13.058208 18.758842 13.104247 18.736015 C 13.150285 18.713188 13.235036 18.668476 13.292583 18.636654 C 13.350131 18.604832 13.433705 18.55629 13.478304 18.528782 C 13.522903 18.501274 13.59353 18.4561 13.635252 18.428394 C 13.676973 18.40069 13.766433 18.337029 13.834051 18.286924 C 13.90167 18.23682 13.99644 18.162895 14.044652 18.122643 C 14.092864 18.082394 14.15996 18.02474 14.193752 17.994526 C 14.227545 17.964312 14.290506 17.906025 14.333667 17.865002 C 14.376827 17.823977 14.490118 17.703777 14.585426 17.597889 C 14.680732 17.492002 14.78829 17.367313 14.824441 17.320801 C 14.860593 17.274288 14.916682 17.199615 14.949082 17.154861 C 14.981483 17.110109 15.038663 17.027641 15.07615 16.9716 C 15.113637 16.91556 15.175815 16.817307 15.214323 16.753262 C 15.252832 16.689213 15.309652 16.589651 15.340591 16.532009 C 15.37153 16.474367 15.419693 16.380726 15.447618 16.323917 C 15.475546 16.267109 15.521831 16.16703 15.550475 16.101517 C 15.57912 16.036003 15.618637 15.941 15.638292 15.890395 C 15.657948 15.83979 15.690641 15.751225 15.710945 15.693584 C 15.731248 15.635942 15.763346 15.53815 15.782275 15.476267 C 15.801204 15.414385 15.828565 15.319683 15.843078 15.265819 C 15.857591 15.211955 15.882372 15.111115 15.898148 15.041732 C 15.913921 14.972347 15.938487 14.850893 15.952738 14.771832 C 15.966988 14.692772 15.98686 14.563893 15.996899 14.485436 C 16.006935 14.406981 16.018898 14.300867 16.023479 14.24963 C 16.028061 14.198393 16.034296 14.127651 16.037333 14.092425 C 16.040909 14.050921 16.043657 13.606488 16.045141 12.829731 C 16.047428 11.631083 16.047428 11.631083 16.035446 11.634319 C 16.028858 11.6361 15.792158 11.688778 15.509449 11.751382 C 15.226741 11.813986 14.758569 11.917777 14.469067 11.982028 C 14.179565 12.046279 13.939479 12.09806 13.935543 12.097095 C 13.931356 12.096071 14.065158 11.912199 14.257813 11.654225 C 14.438999 11.41161 14.903947 10.790021 15.291027 10.272918 C 15.678108 9.755814 16.315884 8.904369 16.708305 8.380817 C 17.100729 7.857269 17.432253 7.415405 17.44503 7.398903 C 17.468258 7.368896 17.468258 7.368896 17.788164 7.7948 C 17.964113 8.029047 18.673079 8.975285 19.363646 9.897553 C 20.054213 10.819822 20.706532 11.691617 20.813246 11.834875 C 20.93269 11.995222 21.004395 12.096006 20.99979 12.097068 C 20.995676 12.098017 20.519707 11.993718 19.942076 11.865294 C 19.364447 11.736868 18.891119 11.632599 18.890236 11.633583 C 18.889353 11.634568 18.887291 12.236682 18.885651 12.971614 C 18.883806 13.799305 18.880552 14.349956 18.877102 14.418479 C 18.874037 14.479323 18.868034 14.571026 18.863762 14.622263 C 18.859489 14.6735 18.85132 14.757342 18.84561 14.808579 C 18.839899 14.859818 18.829248 14.94497 18.821943 14.997808 C 18.81464 15.050646 18.799231 15.147589 18.787701 15.213237 C 18.776171 15.278884 18.755297 15.386735 18.741314 15.452906 C 18.727333 15.519076 18.700497 15.63305 18.681681 15.70618 C 18.662865 15.77931 18.629971 15.896786 18.608582 15.967237 C 18.587193 16.037687 18.553858 16.141182 18.534506 16.197222 C 18.515152 16.253262 18.48175 16.344965 18.460283 16.401005 C 18.438814 16.457047 18.39797 16.557655 18.369514 16.624584 C 18.341061 16.691511 18.290279 16.802864 18.256668 16.872036 C 18.223057 16.941206 18.167763 17.04948 18.133797 17.112644 C 18.099831 17.175808 18.04768 17.26882 18.017906 17.31934 C 17.988134 17.369858 17.939444 17.449183 17.909708 17.495615 C 17.879971 17.542049 17.827433 17.621344 17.792957 17.671825 C 17.758482 17.722305 17.697813 17.806976 17.658138 17.859982 C 17.618462 17.912987 17.558319 17.990898 17.524487 18.033117 C 17.490656 18.075336 17.400402 18.179474 17.323925 18.264534 C 17.247446 18.349596 17.150738 18.452837 17.109016 18.493961 C 17.067293 18.535084 17.001707 18.597803 16.963264 18.633335 C 16.924824 18.668869 16.859047 18.727587 16.817095 18.763823 C 16.775143 18.800058 16.701834 18.860661 16.654184 18.898495 C 16.606535 18.936329 16.529881 18.994791 16.483843 19.028412 C 16.437805 19.062033 16.353054 19.120974 16.295507 19.159391 C 16.237959 19.197807 16.157915 19.249382 16.117634 19.274 C 16.077351 19.298616 15.996129 19.345558 15.937144 19.378313 C 15.878159 19.411068 15.796937 19.454401 15.756655 19.474609 C 15.716372 19.49482 15.64454 19.52928 15.597028 19.551189 C 15.549516 19.573101 15.472516 19.606846 15.425918 19.626181 C 15.37932 19.645515 15.299306 19.676884 15.248109 19.695889 C 15.196912 19.714893 15.110293 19.744934 15.055624 19.762646 C 15.000954 19.780359 14.90914 19.807941 14.851592 19.82394 C 14.794045 19.839941 14.699877 19.863762 14.642329 19.876877 C 14.584783 19.889994 14.495724 19.908436 14.444424 19.917858 C 14.393124 19.927282 14.306017 19.941519 14.250855 19.949495 C 14.195694 19.957472 14.110539 19.968031 14.061625 19.97296 C 14.01271 19.977888 13.94326 19.984699 13.907293 19.988096 C 13.865487 19.992044 13.47154 19.995304 12.815168 19.997135 L 11.788437 20 Z M 13.211563 5 L 13.208879 5.841593 L 13.117326 5.857937 C 13.066972 5.866926 12.984574 5.883574 12.93422 5.894934 C 12.883867 5.906292 12.795584 5.928318 12.738037 5.94388 C 12.68049 5.959442 12.588675 5.986631 12.534005 6.004301 C 12.479336 6.021971 12.381636 6.056425 12.316895 6.08087 C 12.252154 6.105312 12.149747 6.147173 12.089322 6.173893 C 12.028896 6.200617 11.941792 6.241146 11.895754 6.263964 C 11.849715 6.286781 11.764964 6.331535 11.707417 6.363419 C 11.64987 6.395302 11.566296 6.443851 11.521696 6.47131 C 11.477097 6.498766 11.40647 6.5439 11.364749 6.571604 C 11.323027 6.59931 11.233567 6.662971 11.165949 6.713076 C 11.09833 6.76318 11.003561 6.837105 10.955348 6.877356 C 10.907136 6.917606 10.840041 6.97526 10.806249 7.005472 C 10.772455 7.035686 10.709495 7.093973 10.666333 7.134998 C 10.623173 7.176022 10.509882 7.296223 10.414575 7.402109 C 10.319268 7.507996 10.211711 7.632687 10.175559 7.679199 C 10.139406 7.725712 10.083319 7.800383 10.050918 7.845137 C 10.018517 7.889891 9.961337 7.972359 9.923851 8.028399 C 9.886364 8.08444 9.824185 8.182693 9.785677 8.246738 C 9.747169 8.310785 9.690349 8.410349 9.659409 8.467991 C 9.628469 8.525631 9.580308 8.619272 9.552382 8.676081 C 9.524455 8.732889 9.478169 8.83297 9.449525 8.898483 C 9.42088 8.963995 9.381362 9.059001 9.361707 9.109604 C 9.342052 9.160209 9.30936 9.248775 9.289056 9.306416 C 9.268753 9.364057 9.236654 9.46185 9.217726 9.523732 C 9.198797 9.585614 9.171435 9.680317 9.156922 9.734181 C 9.142409 9.788045 9.117628 9.888884 9.101853 9.958268 C 9.086079 10.027652 9.061513 10.149106 9.047262 10.228168 C 9.033011 10.307228 9.01314 10.436106 9.003102 10.514563 C 8.993065 10.593019 8.981103 10.699132 8.976521 10.75037 C 8.971939 10.801607 8.965705 10.872349 8.962669 10.907575 C 8.959091 10.949078 8.956343 11.393458 8.95486 12.170093 C 8.952572 13.368566 8.952572 13.368566 8.96717 13.365266 C 8.975198 13.363451 9.448764 13.258283 10.019536 13.131559 C 10.590309 13.004836 11.060532 12.901941 11.064476 12.902905 C 11.068673 12.90393 10.924224 13.102027 10.716059 13.380722 C 10.520485 13.642559 10.049642 14.272002 9.66974 14.779487 C 9.289838 15.286971 8.663752 16.122787 8.278438 16.636852 C 7.893123 17.150921 7.567488 17.584927 7.554804 17.601311 C 7.531743 17.631102 7.531743 17.631102 7.211841 17.205196 C 7.035895 16.970947 6.326927 16.024708 5.636357 15.102443 C 4.945787 14.180178 4.293465 13.308385 4.186752 13.165127 C 4.067309 13.004777 3.995605 12.903994 4.000209 12.902931 C 4.004323 12.901982 4.480295 13.006281 5.057924 13.134706 C 5.635554 13.263132 6.10888 13.367401 6.109759 13.366416 C 6.11064 13.365432 6.112701 12.763317 6.114342 12.028385 C 6.116189 11.200445 6.119443 10.650064 6.122897 10.58152 C 6.125962 10.520677 6.131937 10.428974 6.136174 10.377736 C 6.140412 10.326499 6.148574 10.242657 6.154313 10.19142 C 6.160052 10.140182 6.17073 10.05503 6.178041 10.002192 C 6.185353 9.949354 6.20077 9.85241 6.2123 9.786763 C 6.22383 9.721116 6.244704 9.613264 6.258686 9.547094 C 6.272668 9.480923 6.299503 9.366949 6.318319 9.293819 C 6.337135 9.220689 6.37003 9.103214 6.391419 9.032763 C 6.412808 8.962311 6.446142 8.858818 6.465496 8.802778 C 6.484849 8.746738 6.518249 8.655035 6.539717 8.598995 C 6.561186 8.542953 6.602031 8.442345 6.630485 8.375416 C 6.658939 8.308489 6.70972 8.197136 6.743332 8.127964 C 6.776944 8.058794 6.832236 7.95052 6.866203 7.887356 C 6.90017 7.824192 6.952321 7.731178 6.982093 7.68066 C 7.011866 7.630142 7.060556 7.550817 7.090293 7.504383 C 7.12003 7.457949 7.172568 7.378656 7.207044 7.328175 C 7.241519 7.277695 7.302188 7.193024 7.341863 7.140018 C 7.381538 7.087011 7.441681 7.009102 7.475513 6.966883 C 7.509346 6.924664 7.599599 6.820524 7.676076 6.735464 C 7.752553 6.650404 7.849262 6.547163 7.890984 6.506039 C 7.932705 6.464916 7.998294 6.402197 8.036735 6.366665 C 8.075176 6.331131 8.140952 6.272413 8.182905 6.236177 C 8.224856 6.199942 8.298167 6.139339 8.345817 6.101505 C 8.393466 6.063671 8.470119 6.005207 8.516157 5.971586 C 8.562195 5.937967 8.646946 5.879026 8.704494 5.840609 C 8.762041 5.802191 8.842084 5.750618 8.882367 5.726 C 8.92265 5.701384 9.00387 5.654442 9.062857 5.621687 C 9.121842 5.588932 9.203063 5.545599 9.243345 5.525389 C 9.283628 5.50518 9.355461 5.47072 9.402973 5.448809 C 9.450484 5.426899 9.527484 5.393152 9.574082 5.373819 C 9.620681 5.354485 9.700695 5.323116 9.751891 5.304111 C 9.803088 5.285107 9.889707 5.255066 9.944377 5.237354 C 9.999046 5.219641 10.09086 5.192059 10.148408 5.176058 C 10.205956 5.160059 10.300123 5.136238 10.357671 5.123121 C 10.415218 5.110006 10.504275 5.091564 10.555576 5.08214 C 10.606877 5.072718 10.693983 5.058481 10.749145 5.050505 C 10.804306 5.042528 10.889461 5.031969 10.938375 5.027039 C 10.98729 5.022112 11.05674 5.015299 11.092707 5.011904 C 11.134513 5.007956 11.52846 5.004694 12.184833 5.002863 L 13.211563 5 Z';

const BjsubwayIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultBjsubwayIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultBjsubwayIntStationAttributes.nameOffsetY,
        outOfStation = defaultBjsubwayIntStationAttributes.outOfStation,
    } = attrs[StationType.BjsubwayInt] ?? defaultBjsubwayIntStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -12 : nameOffsetX === 'right' ? 12 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length * NAME_DY[nameOffsetY].lineHeight + 8) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return React.useMemo(
        () => (
            <g id={id}>
                <g transform={`translate(${x - 12.5}, ${y - 12.5})`}>
                    <circle cx="12.5" cy="12.5" r="10.5" stroke="black" strokeWidth="1" fill="white" />
                    <path
                        d={PATH_ARROW}
                        fill={outOfStation ? '#898989' : 'black'}
                        stroke={outOfStation ? '#898989' : 'black'}
                        strokeWidth="0.533618"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <circle
                        id={`stn_core_${id}`}
                        cx="12.5"
                        cy="12.5"
                        r="10.5"
                        stroke="black"
                        strokeWidth="1"
                        strokeOpacity="0"
                        fill="white"
                        fillOpacity="0"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    />
                </g>
                <g
                    transform={`translate(${x + textX}, ${y + textY})`}
                    textAnchor={textAnchor}
                    className="rmp-name-station"
                >
                    <MultilineText
                        text={names[0].split('\\')}
                        fontSize={LINE_HEIGHT.zh}
                        lineHeight={LINE_HEIGHT.zh}
                        grow="up"
                        className="rmp-name__zh"
                    />
                    <MultilineText
                        text={names[1].split('\\')}
                        fontSize={LINE_HEIGHT.en}
                        lineHeight={LINE_HEIGHT.en}
                        grow="down"
                        className="rmp-name__en"
                    />
                </g>
            </g>
        ),
        [id, x, y, ...names, nameOffsetX, nameOffsetY, outOfStation, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * BjsubwayIntStation specific props.
 */
export interface BjsubwayIntStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    outOfStation: boolean;
}

const defaultBjsubwayIntStationAttributes: BjsubwayIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    outOfStation: false,
};

const bjsubwayIntStationFields = [
    {
        type: 'textarea',
        label: 'panel.details.station.bjsubwayInt.nameZh',
        value: (attrs?: BjsubwayIntStationAttributes) =>
            (attrs ?? defaultBjsubwayIntStationAttributes).names[0].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: BjsubwayIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayIntStationAttributes;
            // set value
            attrs.names[0] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'textarea',
        label: 'panel.details.station.bjsubwayInt.nameEn',
        value: (attrs?: BjsubwayIntStationAttributes) =>
            (attrs ?? defaultBjsubwayIntStationAttributes).names[1].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: BjsubwayIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayIntStationAttributes;
            // set value
            attrs.names[1] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.bjsubwayInt.nameOffsetX',
        value: (attrs?: BjsubwayIntStationAttributes) => (attrs ?? defaultBjsubwayIntStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        disabledOptions: (attrs?: BjsubwayIntStationAttributes) => (attrs?.nameOffsetY === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: BjsubwayIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayIntStationAttributes;
            // set value
            attrs.nameOffsetX = val as NameOffsetX;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.bjsubwayInt.nameOffsetY',
        value: (attrs?: BjsubwayIntStationAttributes) => (attrs ?? defaultBjsubwayIntStationAttributes).nameOffsetY,
        options: { top: 'top', middle: 'middle', bottom: 'bottom' },
        disabledOptions: (attrs?: BjsubwayIntStationAttributes) => (attrs?.nameOffsetX === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: BjsubwayIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayIntStationAttributes;
            // set value
            attrs.nameOffsetY = val as NameOffsetY;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'switch',
        label: 'panel.details.station.bjsubwayInt.outOfStation',
        oneLine: true,
        isChecked: (attrs?: BjsubwayIntStationAttributes) =>
            (attrs ?? defaultBjsubwayIntStationAttributes).outOfStation,
        onChange: (val: boolean, attrs_: BjsubwayIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayIntStationAttributes;
            // set value
            attrs.outOfStation = val;
            // return modified attrs
            return attrs;
        },
    },
];

const bjsubwayIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <g transform="translate(6, 6)">
            <circle cx="6" cy="6" r="6" stroke="black" strokeWidth="1" fill="white" />
            <path d={PATH_ARROW} stroke="black" strokeWidth="0.533618" strokeLinecap="round" strokeLinejoin="round" />
        </g>
    </svg>
);

const bjsubwayIntStation: Station<BjsubwayIntStationAttributes> = {
    component: BjsubwayIntStation,
    icon: bjsubwayIntStationIcon,
    defaultAttrs: defaultBjsubwayIntStationAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: bjsubwayIntStationFields,
    metadata: {
        displayName: 'panel.details.station.bjsubwayInt.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: ['interchange'],
    },
};

export default bjsubwayIntStation;
