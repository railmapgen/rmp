import { RmgButtonGroup, RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { Flex } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    defaultStationAttributes,
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { MultilineText } from '../common/multiline-text';
import { LINE_HEIGHT } from './bjsubway-basic';

const PATH_ARROW =
    'M -0.406607 4.285714 L -0.405074 3.805223 L -0.345283 3.794155 C -0.312400 3.788069 -0.259278 3.776938 -0.227235 3.769420 C -0.195192 3.761902 -0.144853 3.749016 -0.115371 3.740783 C -0.085889 3.732553 -0.037443 3.717799 -0.007715 3.707999 C 0.022014 3.698199 0.074587 3.679489 0.109115 3.666421 C 0.143644 3.653353 0.200145 3.630171 0.234674 3.614907 C 0.269202 3.599643 0.318976 3.576481 0.345284 3.563437 C 0.371591 3.550393 0.420021 3.524843 0.452905 3.506659 C 0.485789 3.488475 0.533546 3.460737 0.559031 3.445018 C 0.584516 3.429299 0.624874 3.403486 0.648715 3.387654 C 0.672556 3.371823 0.723676 3.335445 0.762315 3.306814 C 0.800954 3.278183 0.855109 3.235940 0.882658 3.212939 C 0.910208 3.189939 0.948549 3.156994 0.967858 3.139729 C 0.987169 3.122464 1.023146 3.089157 1.047810 3.065715 C 1.072473 3.042273 1.137210 2.973587 1.191672 2.913079 C 1.246133 2.852573 1.307594 2.781322 1.328252 2.754743 C 1.348910 2.728165 1.380961 2.685494 1.399475 2.659921 C 1.417990 2.634348 1.450665 2.587223 1.472086 2.555200 C 1.493507 2.523177 1.529037 2.467033 1.551042 2.430435 C 1.573047 2.393836 1.605515 2.336943 1.623195 2.304005 C 1.640874 2.271067 1.668396 2.217558 1.684353 2.185095 C 1.700312 2.152634 1.726761 2.095446 1.743129 2.058010 C 1.759497 2.020573 1.782078 1.966286 1.793310 1.937369 C 1.804542 1.908451 1.823223 1.857843 1.834826 1.824905 C 1.846427 1.791967 1.864769 1.736086 1.875586 1.700724 C 1.886402 1.665363 1.902037 1.611247 1.910330 1.580468 C 1.918623 1.549689 1.932784 1.492066 1.941799 1.452418 C 1.950812 1.412770 1.964850 1.343367 1.972993 1.298190 C 1.981136 1.253013 1.992491 1.179367 1.998228 1.134535 C 2.003963 1.089703 2.010799 1.029067 2.013417 0.999789 C 2.016035 0.970510 2.019598 0.930086 2.021333 0.909957 C 2.023377 0.886241 2.024947 0.632279 2.025795 0.188418 C 2.027102 -0.496524 2.027102 -0.496524 2.020255 -0.494675 C 2.016490 -0.493657 1.881233 -0.463555 1.719685 -0.427782 C 1.558138 -0.392008 1.290611 -0.332699 1.125181 -0.295984 C 0.959751 -0.259269 0.822559 -0.229680 0.820310 -0.230231 C 0.817918 -0.230817 0.894376 -0.335886 1.004465 -0.483300 C 1.107999 -0.621937 1.373684 -0.977131 1.594873 -1.272618 C 1.816062 -1.568106 2.180505 -2.054646 2.404746 -2.353819 C 2.628988 -2.652989 2.818430 -2.905483 2.825731 -2.914913 C 2.839005 -2.932059 2.839005 -2.932059 3.021808 -2.688686 C 3.122350 -2.554830 3.527474 -2.014123 3.922083 -1.487113 C 4.316693 -0.960102 4.689447 -0.461933 4.750426 -0.380071 C 4.818680 -0.288445 4.859654 -0.230854 4.857023 -0.230247 C 4.854672 -0.229705 4.582690 -0.289304 4.252615 -0.362689 C 3.922541 -0.436075 3.652068 -0.495658 3.651563 -0.495095 C 3.651059 -0.494533 3.649881 -0.150467 3.648943 0.269494 C 3.647889 0.742460 3.646030 1.057118 3.644058 1.096274 C 3.642307 1.131042 3.638877 1.183443 3.636435 1.212722 C 3.633994 1.242000 3.629326 1.289910 3.626063 1.319188 C 3.622799 1.348467 3.616713 1.397126 3.612539 1.427319 C 3.608366 1.457512 3.599561 1.512908 3.592972 1.550421 C 3.586383 1.587934 3.574455 1.649563 3.566465 1.687375 C 3.558476 1.725186 3.543141 1.790314 3.532389 1.832103 C 3.521637 1.873891 3.502841 1.941021 3.490618 1.981278 C 3.478396 2.021535 3.459347 2.080675 3.448289 2.112698 C 3.437230 2.144721 3.418143 2.197123 3.405876 2.229146 C 3.393608 2.261170 3.370269 2.318660 3.354008 2.356905 C 3.337749 2.395149 3.308731 2.458779 3.289525 2.498306 C 3.270318 2.537832 3.238722 2.599703 3.219313 2.635797 C 3.199903 2.671890 3.170103 2.725040 3.153089 2.753909 C 3.136077 2.782776 3.108254 2.828105 3.091262 2.854637 C 3.074269 2.881171 3.044247 2.926482 3.024547 2.955329 C 3.004847 2.984174 2.970179 3.032558 2.947507 3.062847 C 2.924835 3.093135 2.890468 3.137656 2.871135 3.161781 C 2.851803 3.185906 2.800230 3.245414 2.756529 3.294019 C 2.712826 3.342626 2.657565 3.401621 2.633723 3.425121 C 2.609882 3.448619 2.572404 3.484459 2.550437 3.504763 C 2.528471 3.525068 2.490884 3.558621 2.466911 3.579327 C 2.442939 3.600033 2.401048 3.634663 2.373819 3.656283 C 2.346591 3.677902 2.302789 3.711309 2.276482 3.730521 C 2.250174 3.749733 2.201745 3.783414 2.168861 3.805366 C 2.135977 3.827318 2.090237 3.856790 2.067219 3.870857 C 2.044201 3.884923 1.997788 3.911747 1.964082 3.930465 C 1.930377 3.949182 1.883964 3.973943 1.860946 3.985491 C 1.837927 3.997040 1.796880 4.016731 1.769730 4.029251 C 1.742581 4.041772 1.698581 4.061055 1.671953 4.072103 C 1.645326 4.083151 1.599603 4.101077 1.570348 4.111937 C 1.541093 4.122796 1.491596 4.139962 1.460357 4.150083 C 1.429117 4.160205 1.376651 4.175966 1.343767 4.185109 C 1.310883 4.194252 1.257073 4.207864 1.224188 4.215358 C 1.191305 4.222854 1.140414 4.233392 1.111099 4.238776 C 1.081785 4.244161 1.032010 4.252297 1.000489 4.256854 C 0.968968 4.261413 0.920308 4.267446 0.892357 4.270263 C 0.864406 4.273079 0.824720 4.276971 0.804167 4.278912 C 0.780278 4.281168 0.555166 4.283031 0.180096 4.284077 L -0.406607 4.285714 Z M 0.406607 -4.285714 L 0.405074 -3.804804 L 0.352758 -3.795465 C 0.323984 -3.790328 0.276899 -3.780815 0.248126 -3.774323 C 0.219353 -3.767833 0.168905 -3.755247 0.136021 -3.746354 C 0.103137 -3.737462 0.050671 -3.721925 0.019431 -3.711828 C -0.011808 -3.701731 -0.067637 -3.682043 -0.104631 -3.668074 C -0.141626 -3.654107 -0.200145 -3.630187 -0.234673 -3.614918 C -0.269202 -3.599647 -0.318976 -3.576488 -0.345283 -3.563449 C -0.371591 -3.550411 -0.420021 -3.524837 -0.452905 -3.506618 C -0.485789 -3.488399 -0.533545 -3.460657 -0.559031 -3.444966 C -0.584516 -3.429277 -0.624874 -3.403486 -0.648715 -3.387655 C -0.672556 -3.371823 -0.723676 -3.335445 -0.762315 -3.306814 C -0.800954 -3.278183 -0.855108 -3.235940 -0.882658 -3.212939 C -0.910208 -3.189939 -0.948548 -3.156994 -0.967858 -3.139730 C -0.987169 -3.122465 -1.023146 -3.089158 -1.047810 -3.065715 C -1.072473 -3.042273 -1.137210 -2.973587 -1.191671 -2.913081 C -1.246133 -2.852574 -1.307594 -2.781322 -1.328252 -2.754743 C -1.348911 -2.728165 -1.380961 -2.685495 -1.399475 -2.659922 C -1.417990 -2.634348 -1.450665 -2.587223 -1.472085 -2.555201 C -1.493506 -2.523177 -1.529037 -2.467033 -1.551042 -2.430435 C -1.573046 -2.393837 -1.605515 -2.336943 -1.623195 -2.304005 C -1.640875 -2.271068 -1.668395 -2.217559 -1.684353 -2.185097 C -1.700311 -2.152635 -1.726761 -2.095446 -1.743129 -2.058010 C -1.759497 -2.020574 -1.782079 -1.966285 -1.793310 -1.937369 C -1.804542 -1.908452 -1.823223 -1.857843 -1.834825 -1.824905 C -1.846427 -1.791967 -1.864769 -1.736086 -1.875585 -1.700725 C -1.886402 -1.665363 -1.902037 -1.611247 -1.910330 -1.580468 C -1.918623 -1.549689 -1.932784 -1.492066 -1.941798 -1.452418 C -1.950812 -1.412770 -1.964850 -1.343368 -1.972993 -1.298190 C -1.981137 -1.253013 -1.992491 -1.179368 -1.998227 -1.134535 C -2.003963 -1.089703 -2.010798 -1.029067 -2.013417 -0.999789 C -2.016035 -0.970510 -2.019597 -0.930086 -2.021332 -0.909957 C -2.023377 -0.886241 -2.024947 -0.632310 -2.025794 -0.188518 C -2.027102 0.496323 -2.027102 0.496323 -2.018760 0.494438 C -2.014173 0.493401 -1.743563 0.433305 -1.417408 0.360891 C -1.091252 0.288478 -0.822553 0.229681 -0.820299 0.230231 C -0.817901 0.230817 -0.900443 0.344015 -1.019395 0.503270 C -1.131151 0.652891 -1.400205 1.012573 -1.617291 1.302564 C -1.834378 1.592555 -2.192142 2.070164 -2.412321 2.363915 C -2.632501 2.657669 -2.818578 2.905673 -2.825826 2.915035 C -2.839004 2.932058 -2.839004 2.932058 -3.021805 2.688683 C -3.122346 2.554827 -3.527470 2.014119 -3.922082 1.487110 C -4.316693 0.960102 -4.689449 0.461934 -4.750427 0.380073 C -4.818681 0.288444 -4.859654 0.230854 -4.857023 0.230246 C -4.854673 0.229704 -4.582689 0.289303 -4.252615 0.362689 C -3.922541 0.436075 -3.652069 0.495658 -3.651566 0.495095 C -3.651063 0.494533 -3.649885 0.150467 -3.648947 -0.269494 C -3.647892 -0.742603 -3.646033 -1.057106 -3.644059 -1.096274 C -3.642307 -1.131042 -3.638893 -1.183443 -3.636472 -1.212722 C -3.634050 -1.242001 -3.629386 -1.289910 -3.626107 -1.319189 C -3.622827 -1.348467 -3.616726 -1.397126 -3.612548 -1.427319 C -3.608370 -1.457512 -3.599560 -1.512909 -3.592971 -1.550421 C -3.586383 -1.587934 -3.574455 -1.649563 -3.566465 -1.687375 C -3.558475 -1.725187 -3.543141 -1.790315 -3.532389 -1.832103 C -3.521637 -1.873892 -3.502840 -1.941021 -3.490618 -1.981278 C -3.478395 -2.021537 -3.459347 -2.080675 -3.448288 -2.112698 C -3.437229 -2.144721 -3.418143 -2.197123 -3.405876 -2.229146 C -3.393608 -2.261170 -3.370268 -2.318660 -3.354009 -2.356905 C -3.337749 -2.395149 -3.308731 -2.458779 -3.289525 -2.498306 C -3.270318 -2.537832 -3.238722 -2.599703 -3.219313 -2.635797 C -3.199903 -2.671890 -3.170102 -2.725041 -3.153090 -2.753909 C -3.136077 -2.782776 -3.108254 -2.828105 -3.091261 -2.854638 C -3.074269 -2.881172 -3.044247 -2.926482 -3.024546 -2.955329 C -3.004846 -2.984174 -2.970178 -3.032558 -2.947507 -3.062847 C -2.924835 -3.093137 -2.890468 -3.137656 -2.871135 -3.161781 C -2.851802 -3.185906 -2.800229 -3.245415 -2.756528 -3.294021 C -2.712827 -3.342626 -2.657565 -3.401621 -2.633723 -3.425121 C -2.609883 -3.448619 -2.572403 -3.484459 -2.550437 -3.504763 C -2.528471 -3.525068 -2.490885 -3.558621 -2.466911 -3.579327 C -2.442939 -3.600033 -2.401047 -3.634663 -2.373819 -3.656283 C -2.346591 -3.677902 -2.302789 -3.711310 -2.276482 -3.730522 C -2.250174 -3.749733 -2.201745 -3.783414 -2.168861 -3.805366 C -2.135977 -3.827319 -2.090238 -3.856790 -2.067219 -3.870857 C -2.044200 -3.884923 -1.997789 -3.911747 -1.964082 -3.930465 C -1.930376 -3.949182 -1.883964 -3.973943 -1.860946 -3.985492 C -1.837927 -3.997040 -1.796879 -4.016731 -1.769730 -4.029252 C -1.742581 -4.041772 -1.698581 -4.061056 -1.671953 -4.072103 C -1.645325 -4.083151 -1.599603 -4.101077 -1.570348 -4.111937 C -1.541093 -4.122796 -1.491596 -4.139962 -1.460356 -4.150083 C -1.429117 -4.160205 -1.376651 -4.175966 -1.343767 -4.185110 C -1.310882 -4.194252 -1.257073 -4.207864 -1.224188 -4.215359 C -1.191304 -4.222854 -1.140414 -4.233392 -1.111099 -4.238777 C -1.081785 -4.244161 -1.032010 -4.252297 -1.000489 -4.256854 C -0.968968 -4.261413 -0.920308 -4.267446 -0.892357 -4.270263 C -0.864406 -4.273079 -0.824720 -4.276972 -0.804167 -4.278912 C -0.780278 -4.281168 -0.555166 -4.283032 -0.180095 -4.284078 L 0.406607 -4.285714 Z';

const BjsubwayIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultBjsubwayIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultBjsubwayIntStationAttributes.nameOffsetY,
        outOfStation = defaultBjsubwayIntStationAttributes.outOfStation,
        scale = defaultBjsubwayIntStationAttributes.scale,
        minorOffsetX = defaultBjsubwayIntStationAttributes.minorOffsetX,
        minorOffsetY = defaultBjsubwayIntStationAttributes.minorOffsetY,
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

    const getTextOffset = (oX: NameOffsetX, oY: NameOffsetY) => {
        if (oX === 'left' && oY === 'top') {
            return [-5, -names[1].split('\n').length * LINE_HEIGHT[oY] - 4 - (outOfStation ? 12.5 : 0), -2];
        } else if (oX === 'middle' && oY === 'top') {
            return [0, -names[1].split('\n').length * LINE_HEIGHT[oY] - 6 - (outOfStation ? 12.5 : 0), 0];
        } else if (oX === 'right' && oY === 'top') {
            return [5, -names[1].split('\n').length * LINE_HEIGHT[oY] - 4 - (outOfStation ? 12.5 : 0), 2];
        } else if (oX === 'left' && oY === 'bottom') {
            return [-5, names[0].split('\n').length * LINE_HEIGHT[oY] + 4, -2];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [0, names[0].split('\n').length * LINE_HEIGHT[oY] + 7, 0];
        } else if (oX === 'right' && oY === 'bottom') {
            return [5, names[0].split('\n').length * LINE_HEIGHT[oY] + 4, 2];
        } else if (oX === 'left' && oY === 'middle') {
            return [-8, 1, -2];
        } else if (oX === 'right' && oY === 'middle') {
            return [8, 1, 2];
        } else return [0, 0, 0];
    };
    const [textX, textY, outOfStationOffset] = getTextOffset(nameOffsetX, nameOffsetY);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    const getMinorTextOffset = (offset: '-2' | '-1' | '0' | '1' | '2') => {
        if (offset === '-2') return -8;
        else if (offset === '-1') return -2.5;
        else if (offset === '0') return 0;
        else if (offset === '1') return 2.5;
        else if (offset === '2') return 8;
        else return 0;
    };
    const minorTextX = getMinorTextOffset(minorOffsetX);
    const minorTextY = getMinorTextOffset(minorOffsetY);

    return (
        <g id={id}>
            <g transform={`translate(${x}, ${y})`}>
                <circle r="6" stroke="black" strokeWidth="1" fill="white" />
                <path d={PATH_ARROW} fill={outOfStation ? '#898989' : 'black'} fillRule="evenodd" stroke="none" />

                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <circle
                    id={`stn_core_${id}`}
                    r="6"
                    stroke="black"
                    strokeWidth="1"
                    strokeOpacity="0"
                    fill="white"
                    fillOpacity="0"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                    className="removeMe"
                />
            </g>
            <g transform={`translate(${x + textX + minorTextX}, ${y + textY + minorTextY})`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={LINE_HEIGHT.zh}
                    lineHeight={LINE_HEIGHT.zh}
                    grow="up"
                    {...getLangStyle(TextLanguage.zh)}
                    baseOffset={1}
                    transform={`scale(${scale} 1)`}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={LINE_HEIGHT.en}
                    lineHeight={LINE_HEIGHT.en}
                    grow="down"
                    {...getLangStyle(TextLanguage.en)}
                    baseOffset={1}
                    transform={`scale(${scale} 1)`}
                />
                {outOfStation && (
                    <g>
                        <text
                            dx={outOfStationOffset}
                            dy={names[1].split('\n').length * LINE_HEIGHT.en + 1}
                            fontSize={LINE_HEIGHT.en}
                            dominantBaseline="hanging"
                            {...getLangStyle(TextLanguage.zh)}
                        >
                            站内换乘
                        </text>
                        <text
                            dx={outOfStationOffset}
                            dy={(names[1].split('\n').length + 1) * LINE_HEIGHT.en + 2}
                            fontSize={LINE_HEIGHT.en}
                            dominantBaseline="hanging"
                            {...getLangStyle(TextLanguage.zh)}
                        >
                            暂缓开通
                        </text>
                        <text
                            fontSize="12"
                            dx={
                                -outOfStationOffset / 1.8 +
                                (outOfStationOffset < 0 ? 25 : outOfStationOffset === 0 ? 12.5 : 0)
                            }
                            dy={names[1].split('\n').length * LINE_HEIGHT.en + 10}
                            letterSpacing={25}
                            fontWeight={200}
                            transform="scale(0.8 1)"
                        >
                            ()
                        </text>
                    </g>
                )}
            </g>
        </g>
    );
};

/**
 * BjsubwayIntStation specific props.
 */
export interface BjsubwayIntStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    outOfStation: boolean;
    scale: number;
    minorOffsetX: '-2' | '-1' | '0' | '1' | '2';
    minorOffsetY: '-2' | '-1' | '0' | '1' | '2';
}

const defaultBjsubwayIntStationAttributes: BjsubwayIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    outOfStation: false,
    scale: 1,
    minorOffsetX: '0',
    minorOffsetY: '0',
};

const BJSubwayIntAttrsComponent = (props: AttrsProps<BjsubwayIntStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names.at(1) ?? defaultBjsubwayIntStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX,
            options: {
                left: t('panel.details.stations.common.left'),
                middle: t('panel.details.stations.common.middle'),
                right: t('panel.details.stations.common.right'),
            },
            disabledOptions: attrs.nameOffsetY === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetX = val as NameOffsetX;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetY'),
            value: attrs.nameOffsetY,
            options: {
                top: t('panel.details.stations.common.top'),
                middle: t('panel.details.stations.common.middle'),
                bottom: t('panel.details.stations.common.bottom'),
            },
            disabledOptions: attrs.nameOffsetX === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'slider',
            label: t('panel.details.stations.bjsubwayInt.scale'),
            value: attrs.scale ?? defaultBjsubwayIntStationAttributes.scale,
            onChange: val => {
                attrs.scale = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            step: 0.025,
            min: 0.5,
            max: 1,
        },
        {
            type: 'switch',
            label: t('panel.details.stations.bjsubwayInt.outOfStation'),
            oneLine: true,
            isChecked: attrs.outOfStation ?? defaultBjsubwayIntStationAttributes.outOfStation,
            onChange: val => {
                attrs.outOfStation = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('panel.details.stations.bjsubwayInt.minorOffset.labelX'),
            component: (
                <RmgButtonGroup
                    selections={[
                        {
                            label: t('panel.details.stations.bjsubwayInt.minorOffset.-2'),
                            value: '-2',
                        },
                        {
                            label: t('panel.details.stations.bjsubwayInt.minorOffset.-1'),
                            value: '-1',
                        },
                        {
                            label: t('panel.details.stations.bjsubwayInt.minorOffset.0'),
                            value: '0',
                        },
                        {
                            label: t('panel.details.stations.bjsubwayInt.minorOffset.1'),
                            value: '1',
                        },
                        {
                            label: t('panel.details.stations.bjsubwayInt.minorOffset.2'),
                            value: '2',
                        },
                    ]}
                    defaultValue={attrs.minorOffsetX ?? defaultBjsubwayIntStationAttributes.minorOffsetX}
                    onChange={val => {
                        attrs.minorOffsetX = val as '-2' | '-1' | '0' | '1' | '2';
                        handleAttrsUpdate(id, attrs);
                    }}
                    multiSelect={false}
                />
            ),
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('panel.details.stations.bjsubwayInt.minorOffset.labelY'),
            component: (
                <RmgButtonGroup
                    selections={[
                        {
                            label: t('panel.details.stations.bjsubwayInt.minorOffset.-1'),
                            value: '-1',
                        },
                        {
                            label: t('panel.details.stations.bjsubwayInt.minorOffset.0'),
                            value: '0',
                        },
                        {
                            label: t('panel.details.stations.bjsubwayInt.minorOffset.1'),
                            value: '1',
                        },
                    ]}
                    defaultValue={attrs.minorOffsetY ?? defaultBjsubwayIntStationAttributes.minorOffsetY}
                    onChange={val => {
                        attrs.minorOffsetY = val as '-2' | '-1' | '0' | '1' | '2';
                        handleAttrsUpdate(id, attrs);
                    }}
                    multiSelect={false}
                />
            ),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

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
    attrsComponent: BJSubwayIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.bjsubwayInt.displayName',
        cities: [CityCode.Beijing],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: ['interchange'],
    },
};

export default bjsubwayIntStation;
