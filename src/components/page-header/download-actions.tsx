import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Badge,
    Box,
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
import { isTauri } from '../../constants/server';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setGlobalAlert } from '../../redux/runtime/runtime-slice';
import { downloadAs, downloadBlobAs, makeRenderReadySVGElement } from '../../util/download';
import { isSafari } from '../../util/fonts';
import { calculateCanvasSize } from '../../util/helpers';
import { stringifyParam } from '../../util/save';
import { ToRmgModal } from './rmp-to-rmg';
import TermsAndConditionsModal from './terms-and-conditions';

export default function DownloadActions() {
    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');
    const dispatch = useRootDispatch();
    const {
        activeSubscriptions: { RMP_EXPORT },
    } = useRootSelector(state => state.account);
    const {
        telemetry: { project: isAllowProjectTelemetry },
    } = useRootSelector(state => state.app);
    const param = useRootSelector(state => state.param);
    const isAllowAppTelemetry = rmgRuntime.isAllowAnalytics();
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
    const scales = [25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000];
    const scaleOptions: { [k: number]: string } = Object.fromEntries(scales.map(v => [v, `${v}%`]));
    const [resvgScaleOptions, setResvgScaleOptions] = React.useState<number[]>([]);
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
                if (value === 1.1) setIsSystemFontsOnly(true);
            },
        },
    ];
    const pngFields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('header.download.scale'),
            value: scale,
            options: scaleOptions,
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
    const [isSystemFontsOnly, setIsSystemFontsOnly] = React.useState(false);
    const [isAttachSelected, setIsAttachSelected] = React.useState(false);
    const [isTermsAndConditionsSelected, setIsTermsAndConditionsSelected] = React.useState(false);
    const [isDownloadRunning, setIsDownloadRunning] = React.useState(false);
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
            setResvgScaleOptions(disabledScales);
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
        setIsDownloadRunning(true);
        if (isAllowAppTelemetry)
            rmgRuntime.event(
                Events.DOWNLOAD_IMAGES,
                isAllowProjectTelemetry ? { numberOfNodes: graph.current.order, numberOfEdges: graph.current.size } : {}
            );

        const { elem, width, height } = await makeRenderReadySVGElement(
            graph.current,
            isAttachSelected,
            isSystemFontsOnly,
            svgVersion
        );
        // white spaces will be converted to &nbsp; and will fail the canvas render process
        // in fact other named characters might also break such as `& -> &amp;`, let's fix if someone reports
        const svgString = elem.outerHTML.replace(/&nbsp;/g, ' ');

        if (format === 'svg') {
            downloadAs(`RMP_${new Date().valueOf()}.svg`, 'image/svg+xml', svgString);
            setIsDownloadRunning(false);
            return;
        }

        // always use resvg as mac has saving issues with downloadAs tauri-apps/tauri#4633
        if (isTauri) {
            // note mtr fonts are replaced in Tauri/resvg
            // @ts-expect-error
            window.parent.__TAURI__.core
                .invoke('render_image', { svgString, scale, isTransparent, isSystemFontsOnly })
                .then(() => setIsDownloadRunning(false));
            return;
        }

        // fall back to canvas rendering

        // append to document to render the svg
        document.body.appendChild(elem);
        // convert it to an encoded string
        const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
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
                        setIsDownloadRunning(false);
                        if (!blob) {
                            // The canvas size is bigger than the current browser can support.
                            dispatch(setGlobalAlert({ status: 'error', message: t('header.download.imageTooBig') }));
                            return;
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
                        <br />
                        <Checkbox
                            isChecked={isSystemFontsOnly}
                            isDisabled={format === 'svg' && svgVersion === 1.1}
                            onChange={e => setIsSystemFontsOnly(e.target.checked)}
                        >
                            <Text>{t('header.download.isSystemFontsOnly')}</Text>
                        </Checkbox>
                        <Checkbox
                            id="share_info"
                            isChecked={isAttachSelected}
                            onChange={e => setIsAttachSelected(e.target.checked)}
                        >
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
                            id="agree_terms"
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

                        {format === 'png' && resvgScaleOptions.includes(scale) && !isTauri && (
                            <Alert status="error" mt="4">
                                <AlertIcon />
                                <Box>
                                    <AlertTitle>{t('header.download.disabledScaleOptions')}</AlertTitle>
                                    <AlertDescription>
                                        {t('header.download.disabledScaleOptionsSolution')}
                                    </AlertDescription>
                                </Box>
                            </Alert>
                        )}
                        {format === 'png' && resvgScaleOptions.includes(scale) && isTauri && !RMP_EXPORT && (
                            <Alert status="error" mt="4">
                                <AlertIcon />
                                <Box>
                                    <AlertTitle>{t('header.download.disabledScaleOptions')}</AlertTitle>
                                    <AlertDescription>{t('header.settings.pro')}</AlertDescription>
                                </Box>
                            </Alert>
                        )}
                    </ModalBody>

                    <ModalFooter>
                        <HStack>
                            <Button
                                id="download_button"
                                colorScheme="teal"
                                variant="outline"
                                size="sm"
                                isDisabled={
                                    !isTermsAndConditionsSelected ||
                                    // disable if the user is using a scale that is too big for the current browser
                                    (format === 'png' && resvgScaleOptions.includes(scale) && !isTauri) ||
                                    // disable if the user is in Tauri and the scale is too big to render without a subscription
                                    (format === 'png' && resvgScaleOptions.includes(scale) && isTauri && !RMP_EXPORT)
                                }
                                isLoading={isDownloadRunning}
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
