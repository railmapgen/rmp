import {
    Badge,
    Button,
    Checkbox,
    HStack,
    Icon,
    IconButton,
    Link,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    useColorModeValue,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import canvasSize from 'canvas-size';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdDownload, MdImage, MdOpenInNew, MdSave, MdSaveAs } from 'react-icons/md';
import { Events } from '../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setGlobalAlert } from '../../redux/runtime/runtime-slice';
import { downloadAs, downloadBlobAs, makeImages } from '../../util/download';
import { isSafari } from '../../util/fonts';
import { calculateCanvasSize } from '../../util/helpers';
import { stringifyParam } from '../../util/save';
import { ToRmgModal } from './rmp-to-rmg';
import TermsAndConditionsModal from './terms-and-conditions';

export default function DownloadActions() {
    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');
    const dispatch = useRootDispatch();
    const {
        telemetry: { app: isAllowAppTelemetry, project: isAllowProjectTelemetry },
    } = useRootSelector(state => state.app);
    const param = useRootSelector(state => state.param);
    const { t } = useTranslation();

    const graph = React.useRef(window.graph);
    const [format, setFormat] = React.useState('png' as 'png' | 'svg');
    const formatOptions = {
        png: t('header.download.png'),
        svg: t('header.download.svg'),
    };
    const [svgVersion, setSvgVersion] = React.useState(2 as 1.1 | 2);
    const [maxArea, setMaxArea] = React.useState({ width: 1, height: 1, benchmark: 0.001 });
    const [scale, setScale] = React.useState(200);
    const scales = [10, 25, 33, 50, 67, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500, 750, 1000];
    const scaleOptions: { [k: number]: string } = Object.fromEntries(scales.map(v => [v, `${v}%`]));
    const [disabledScaleOptions, setDisabledScaleOptions] = React.useState<number[]>([]);
    const [isTransparent, setIsTransparent] = React.useState(false);
    const fields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('header.download.format'),
            value: format,
            options: formatOptions,
            onChange: value => setFormat(value === 'png' ? 'png' : 'svg'),
        },
    ];
    const svgFields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('header.download.svgVersion'),
            value: svgVersion,
            options: { 1.1: t('header.download.svg1.1'), 2: t('header.download.svg2') },
            onChange: value => {
                setSvgVersion(value as 1.1 | 2);
                if (value === 1.1) setIsUseSystemFontsSelected(true);
            },
        },
    ];
    const pngFields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('header.download.scale'),
            value: scale,
            options: scaleOptions,
            disabledOptions: disabledScaleOptions,
            onChange: value => setScale(value as number),
        },
        {
            type: 'switch',
            label: t('header.download.transparent'),
            isChecked: isTransparent,
            onChange: setIsTransparent,
        },
    ];
    const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
    const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = React.useState(false);
    const [isUseSystemFontsSelected, setIsUseSystemFontsSelected] = React.useState(false);
    const [isAttachSelected, setIsAttachSelected] = React.useState(false);
    const [isTermsAndConditionsSelected, setIsTermsAndConditionsSelected] = React.useState(false);
    const [isToRmgOpen, setIsToRmgOpen] = React.useState(false);

    // calculate the max canvas area the current browser can support
    React.useEffect(() => {
        const getMaxArea = async () => {
            const maximumArea = await canvasSize.maxArea({
                usePromise: true,
                useWorker: true,
            });
            setMaxArea(maximumArea);
        };
        getMaxArea();
    }, []);
    // disable some scale options that are too big for the current browser to generate
    React.useEffect(() => {
        if (isDownloadModalOpen) {
            const { xMin, yMin, xMax, yMax } = calculateCanvasSize(graph.current);
            const [width, height] = [xMax - xMin, yMax - yMin];
            const disabledScales = scales.filter(
                scale => (width * scale) / 100 > maxArea.width && (height * scale) / 100 > maxArea.height
            );
            setDisabledScaleOptions(disabledScales);
        }
    }, [isDownloadModalOpen]);

    const handleDownloadJson = () => {
        if (isAllowAppTelemetry)
            rmgRuntime.event(
                Events.DOWNLOAD_PARAM,
                isAllowProjectTelemetry ? { '#nodes': graph.current.order, '#edges': graph.current.size } : {}
            );
        downloadAs(`RMP_${new Date().valueOf()}.json`, 'application/json', stringifyParam(param));
    };
    // thanks to this article that includes all steps to convert a svg to a png
    // https://levelup.gitconnected.com/draw-an-svg-to-canvas-and-download-it-as-image-in-javascript-f7f7713cf81f
    const handleDownload = async () => {
        setIsDownloadModalOpen(false);
        if (isAllowAppTelemetry)
            rmgRuntime.event(
                Events.DOWNLOAD_IMAGES,
                isAllowProjectTelemetry ? { numberOfNodes: graph.current.order, numberOfEdges: graph.current.size } : {}
            );

        const { elem, width, height } = await makeImages(
            graph.current,
            isAttachSelected,
            isUseSystemFontsSelected,
            svgVersion
        );

        if (format === 'svg') {
            downloadAs(`RMP_${new Date().valueOf()}.svg`, 'image/svg+xml', elem.outerHTML);
            return;
        }

        // append to document to render the svg
        document.body.appendChild(elem);
        // convert it to an encoded string
        const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(elem.outerHTML)));
        // release after use
        document.body.removeChild(elem);
        elem.remove();

        // prepare a clean canvas to be drawn on
        const canvas = document.createElement('canvas');
        const [canvasWidth, canvasHeight] = [(width * scale) / 100, (height * scale) / 100];
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        // set background, with respect to dark mode
        if (!isTransparent) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        const img = new Image();
        img.onload = () => {
            setTimeout(
                () => {
                    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                    canvas.toBlob(blob => {
                        if (!blob) {
                            // The canvas size is bigger than the current browser can support.
                            // See #301 for more discussion and more on https://github.com/jhildenbiddle/canvas-size#test-results
                            // Possible solutions include RazrFalcon/resvg and yisibl/resvg-js.
                            dispatch(setGlobalAlert({ status: 'error', message: t('header.download.imageTooBig') }));
                        }
                        downloadBlobAs(`RMP_${new Date().valueOf()}.png`, blob!);
                    }, 'image/png');
                },
                isSafari() ? 2000 : 0
            );
        };
        img.src = src; // draw src on canvas
    };

    return (
        <Menu id="download">
            <MenuButton as={IconButton} size="sm" variant="ghost" icon={<MdDownload />} />
            <MenuList>
                <MenuItem icon={<MdSave />} onClick={handleDownloadJson}>
                    {t('header.download.config')}
                </MenuItem>
                <MenuItem icon={<MdSaveAs />} onClick={() => setIsToRmgOpen(true)}>
                    {t('header.download.2rmg.title')}
                    <Badge ml="1" colorScheme="green">
                        New
                    </Badge>
                </MenuItem>
                <MenuItem icon={<MdImage />} onClick={() => setIsDownloadModalOpen(true)}>
                    {t('header.download.image')}
                </MenuItem>
            </MenuList>

            <Modal size="xl" isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.download.image')}</ModalHeader>
                    <ModalCloseButton />

                    <ModalBody>
                        <RmgFields fields={fields} />
                        {format === 'svg' && <RmgFields fields={svgFields} />}
                        {format === 'png' && <RmgFields fields={pngFields} />}
                        {format === 'png' && disabledScaleOptions.length > 0 && (
                            <>
                                <Text as="i" fontSize="sm">
                                    {t('header.download.disabledScaleOptions')}
                                </Text>
                                <br />
                                <Text as="i" fontSize="sm">
                                    {t('header.download.disabledScaleOptionsWorkarounds')}
                                </Text>
                                <Link
                                    color="teal.500"
                                    onClick={() => window.open('https://github.com/RazrFalcon/resvg', '_blank')}
                                >
                                    RazrFalcon/resvg <Icon as={MdOpenInNew} />
                                </Link>
                                <br />
                            </>
                        )}
                        <br />
                        <Checkbox
                            isChecked={isUseSystemFontsSelected}
                            isDisabled={format === 'svg' && svgVersion === 1.1}
                            onChange={e => setIsUseSystemFontsSelected(e.target.checked)}
                        >
                            <Text>{t('header.download.useSystemFonts')}</Text>
                        </Checkbox>
                        <Checkbox isChecked={isAttachSelected} onChange={e => setIsAttachSelected(e.target.checked)}>
                            <Text>
                                {t('header.download.shareInfo1')}
                                <Link
                                    color="teal.500"
                                    onClick={() => window.open('https://railmapgen.github.io/rmp', '_blank')}
                                >
                                    {t('header.about.rmp')} <Icon as={MdOpenInNew} />
                                </Link>
                                {t('header.download.shareInfo2')}
                            </Text>
                        </Checkbox>
                        <Checkbox
                            isChecked={isTermsAndConditionsSelected}
                            onChange={e => setIsTermsAndConditionsSelected(e.target.checked)}
                        >
                            <Text>
                                {t('header.download.termsAndConditionsInfo')}
                                <Link color="teal.500" onClick={() => setIsTermsAndConditionsModalOpen(true)}>
                                    {t('header.download.termsAndConditions')} <Icon as={MdOpenInNew} />
                                </Link>
                                {t('header.download.period')}
                            </Text>
                        </Checkbox>
                    </ModalBody>

                    <ModalFooter>
                        <HStack>
                            <Button
                                colorScheme="teal"
                                variant="outline"
                                size="sm"
                                isDisabled={!isTermsAndConditionsSelected || disabledScaleOptions.includes(scale)}
                                onClick={handleDownload}
                            >
                                {t('header.download.confirm')}
                            </Button>
                        </HStack>
                    </ModalFooter>

                    <TermsAndConditionsModal
                        isOpen={isTermsAndConditionsModalOpen}
                        onClose={() => setIsTermsAndConditionsModalOpen(false)}
                    />
                </ModalContent>
            </Modal>

            <ToRmgModal isOpen={isToRmgOpen} onClose={() => setIsToRmgOpen(false)} />
        </Menu>
    );
}
