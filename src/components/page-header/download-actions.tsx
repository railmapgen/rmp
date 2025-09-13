import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Badge,
    Box,
    Button,
    Checkbox,
    FormControl,
    FormLabel,
    HStack,
    Icon,
    IconButton,
    Input,
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
import { Trans, useTranslation } from 'react-i18next';
import { MdDownload, MdImage, MdOpenInNew, MdSave, MdSaveAs } from 'react-icons/md';
import { Events, MiscNodeId, StnId } from '../../constants/constants';
import { isTauri } from '../../constants/server';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setGlobalAlert } from '../../redux/runtime/runtime-slice';
import { downloadAs, downloadBlobAs, makeRenderReadySVGElement } from '../../util/download';
import { isSafari } from '../../util/fonts';
import { calculateCanvasSize } from '../../util/helpers';
import { stringifyParam } from '../../util/save';
import { imageStoreIndexedDB } from '../../util/image-store-indexed-db';
import { ToRmgModal } from './rmp-to-rmg';
import TermsAndConditionsModal from './terms-and-conditions';

const getTauriUrl = () => {
    const baseUrl = 'https://ghfast.top/https://github.com/railmapgen/railmapgen.github.io/releases/download';
    const d = new Date();
    const tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}01`;
    const ver = `${String(d.getFullYear()).slice(-2)}.${d.getMonth() + 1}.1`;
    const platform = navigator.platform;
    const suffix = platform.includes('Linux')
        ? 'amd64.AppImage'
        : platform.includes('Mac')
          ? 'aarch64.dmg'
          : 'x64-setup.exe';
    return baseUrl + `/tauri-${tag}/Rail.Map.Toolkit_${ver}_${suffix}`;
};

const getNodeOptions = () => {
    const options: { [k: string]: string } = { '': '' }; // Default empty option

    if (window.graph) {
        window.graph.forEachNode(nodeId => {
            try {
                const nodeAttrs = window.graph.getNodeAttributes(nodeId);
                const nodeType = nodeAttrs.type;

                // Try to get the display name from the node's attributes
                let displayName = nodeId; // fallback to ID
                if (nodeType && nodeAttrs[nodeType] && (nodeAttrs[nodeType] as any).names) {
                    const names = (nodeAttrs[nodeType] as any).names;
                    if (Array.isArray(names) && names.length > 0) {
                        displayName = names[0] || names[1] || nodeId; // Use first non-empty name
                    }
                }

                options[nodeId] = `${displayName} (${nodeId})`;
            } catch (error) {
                // If we can't get the name, just use the ID
                options[nodeId] = nodeId;
            }
        });
    }

    return options;
};

export default function DownloadActions() {
    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');
    const dispatch = useRootDispatch();
    const {
        activeSubscriptions: { RMP_EXPORT },
    } = useRootSelector(state => state.account);
    const {
        telemetry: { project: isAllowProjectTelemetry },
    } = useRootSelector(state => state.app);
    const { languages } = useRootSelector(state => state.fonts);
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

    // Advanced mode state variables
    const [selectedNodeId, setSelectedNodeId] = React.useState('');
    const [distance, setDistance] = React.useState({
        left: 50,
        right: 50,
        top: 50,
        bottom: 50,
    });
    const [aspectRatio, setAspectRatio] = React.useState('current');
    const [padding, setPadding] = React.useState({
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    });
    const [fourCornersPosition, setFourCornersPosition] = React.useState({
        topLeftX: 0,
        topLeftY: 0,
        topRightX: 0,
        topRightY: 0,
        bottomLeftX: 0,
        bottomLeftY: 0,
        bottomRightX: 0,
        bottomRightY: 0,
    });
    const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
    const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = React.useState(false);
    const [isSystemFontsOnly, setIsSystemFontsOnly] = React.useState(false);
    const [isAttachSelected, setIsAttachSelected] = React.useState(false);
    const [isTermsAndConditionsSelected, setIsTermsAndConditionsSelected] = React.useState(false);
    const [isDownloadRunning, setIsDownloadRunning] = React.useState(false);
    const [isToRmgOpen, setIsToRmgOpen] = React.useState(false);

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

    // Advanced mode fields
    const nodeOptions = React.useMemo(() => getNodeOptions(), [isDownloadModalOpen]);
    const aspectRatioOptions = {
        current: 'Current dimensions',
        '16:9': '16:9',
        '4:3': '4:3',
        '3:2': '3:2',
        '1:1': '1:1',
        '2:3': '2:3',
        '3:4': '3:4',
        '9:16': '9:16',
    };

    const advancedFields: RmgFieldsField[] = [
        {
            type: 'input',
            label: 'Left distance',
            value: distance.left.toString(),
            variant: 'number',
            isDisabled: !selectedNodeId,
            onChange: value => setDistance({ ...distance, left: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Right distance',
            value: distance.right.toString(),
            variant: 'number',
            isDisabled: !selectedNodeId,
            onChange: value => setDistance({ ...distance, right: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Top distance',
            value: distance.top.toString(),
            variant: 'number',
            isDisabled: !selectedNodeId,
            onChange: value => setDistance({ ...distance, top: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Bottom distance',
            value: distance.bottom.toString(),
            variant: 'number',
            isDisabled: !selectedNodeId,
            onChange: value => setDistance({ ...distance, bottom: Number(value) || 0 }),
        },
        {
            type: 'select',
            label: 'Aspect ratio',
            value: aspectRatio,
            options: aspectRatioOptions,
            onChange: value => setAspectRatio(value as string),
        },
        {
            type: 'input',
            label: 'Padding left',
            value: padding.left.toString(),
            variant: 'number',
            onChange: value => setPadding({ ...padding, left: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Padding right',
            value: padding.right.toString(),
            variant: 'number',
            onChange: value => setPadding({ ...padding, right: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Padding top',
            value: padding.top.toString(),
            variant: 'number',
            onChange: value => setPadding({ ...padding, top: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Padding bottom',
            value: padding.bottom.toString(),
            variant: 'number',
            onChange: value => setPadding({ ...padding, bottom: Number(value) || 0 }),
        },
    ];

    const positionFields: RmgFieldsField[] = [
        {
            type: 'input',
            label: 'Top left X',
            value: fourCornersPosition.topLeftX.toString(),
            variant: 'number',
            onChange: value => setFourCornersPosition({ ...fourCornersPosition, topLeftX: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Top left Y',
            value: fourCornersPosition.topLeftY.toString(),
            variant: 'number',
            onChange: value => setFourCornersPosition({ ...fourCornersPosition, topLeftY: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Top right X',
            value: fourCornersPosition.topRightX.toString(),
            variant: 'number',
            onChange: value => setFourCornersPosition({ ...fourCornersPosition, topRightX: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Top right Y',
            value: fourCornersPosition.topRightY.toString(),
            variant: 'number',
            onChange: value => setFourCornersPosition({ ...fourCornersPosition, topRightY: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Bottom left X',
            value: fourCornersPosition.bottomLeftX.toString(),
            variant: 'number',
            onChange: value => setFourCornersPosition({ ...fourCornersPosition, bottomLeftX: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Bottom left Y',
            value: fourCornersPosition.bottomLeftY.toString(),
            variant: 'number',
            onChange: value => setFourCornersPosition({ ...fourCornersPosition, bottomLeftY: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Bottom right X',
            value: fourCornersPosition.bottomRightX.toString(),
            variant: 'number',
            onChange: value => setFourCornersPosition({ ...fourCornersPosition, bottomRightX: Number(value) || 0 }),
        },
        {
            type: 'input',
            label: 'Bottom right Y',
            value: fourCornersPosition.bottomRightY.toString(),
            variant: 'number',
            onChange: value => setFourCornersPosition({ ...fourCornersPosition, bottomRightY: Number(value) || 0 }),
        },
    ];

    // Initialize position controls with current dimensions and reset advanced properties when modal opens
    React.useEffect(() => {
        if (isDownloadModalOpen && graph.current) {
            const { xMin, yMin, xMax, yMax } = calculateCanvasSize(graph.current);
            
            // Reset advanced properties to default values when modal opens
            setSelectedNodeId('');
            setDistance({ left: 50, right: 50, top: 50, bottom: 50 });
            setPadding({ left: 0, right: 0, top: 0, bottom: 0 });
            
            // Initialize position controls with current canvas dimensions
            setFourCornersPosition({
                topLeftX: xMin,
                topLeftY: yMin,
                topRightX: xMax,
                topRightY: yMin,
                bottomLeftX: xMin,
                bottomLeftY: yMax,
                bottomRightX: xMax,
                bottomRightY: yMax,
            });
        }
    }, [isDownloadModalOpen]);

    // Update position controls when advanced properties change
    React.useEffect(() => {
        if (!graph.current) return;

        let xMin, yMin, xMax, yMax;

        if (selectedNodeId && graph.current.hasNode(selectedNodeId)) {
            // Center around selected node
            const nodeX = graph.current.getNodeAttribute(selectedNodeId, 'x');
            const nodeY = graph.current.getNodeAttribute(selectedNodeId, 'y');

            xMin = nodeX - distance.left;
            yMin = nodeY - distance.top;
            xMax = nodeX + distance.right;
            yMax = nodeY + distance.bottom;
        } else {
            // Use current canvas dimensions
            const canvasSize = calculateCanvasSize(graph.current);
            xMin = canvasSize.xMin;
            yMin = canvasSize.yMin;
            xMax = canvasSize.xMax;
            yMax = canvasSize.yMax;
        }

        // Apply padding
        xMin -= padding.left;
        yMin -= padding.top;
        xMax += padding.right;
        yMax += padding.bottom;

        // Update position controls
        setFourCornersPosition({
            topLeftX: xMin,
            topLeftY: yMin,
            topRightX: xMax,
            topRightY: yMin,
            bottomLeftX: xMin,
            bottomLeftY: yMax,
            bottomRightX: xMax,
            bottomRightY: yMax,
        });
    }, [
        selectedNodeId,
        distance.left,
        distance.right,
        distance.top,
        distance.bottom,
        padding.left,
        padding.right,
        padding.top,
        padding.bottom,
    ]);

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
            // Recalculate canvas size using current position controls
            const xMin = Math.min(fourCornersPosition.topLeftX, fourCornersPosition.bottomLeftX);
            const yMin = Math.min(fourCornersPosition.topLeftY, fourCornersPosition.topRightY);
            const xMax = Math.max(fourCornersPosition.topRightX, fourCornersPosition.bottomRightX);
            const yMax = Math.max(fourCornersPosition.bottomLeftY, fourCornersPosition.bottomRightY);
            
            const [width, height] = [xMax - xMin, yMax - yMin];
            const disabledScales = scales.filter(
                scale => (width * scale) / 100 > maxArea.width && (height * scale) / 100 > maxArea.height
            );
            setResvgScaleOptions(disabledScales);
        }
    }, [isDownloadModalOpen, fourCornersPosition, maxArea]);

    const handleDownloadJson = async () => {
        if (isAllowAppTelemetry)
            rmgRuntime.event(
                Events.DOWNLOAD_PARAM,
                isAllowProjectTelemetry ? { '#nodes': graph.current.order, '#edges': graph.current.size } : {}
            );
        const images: { id: string; base64: string }[] = [];
        for (const id of graph.current.filterNodes(
            (id: string, attr: any) =>
                id.startsWith('misc_node') && attr.type === 'image' && attr['image']?.href !== undefined
        )) {
            const attr = graph.current.getNodeAttributes(id)['image']!;
            if (attr.href && attr.href.startsWith('img-l') && (await imageStoreIndexedDB.has(attr.href))) {
                images.push({ id: attr.href, base64: (await imageStoreIndexedDB.get(attr.href))! });
            }
        }
        const data = { ...param, images };
        downloadAs(`RMP_${new Date().valueOf()}.json`, 'application/json', stringifyParam(data));
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

        const customViewBox = {
            xMin: Math.min(fourCornersPosition.topLeftX, fourCornersPosition.bottomLeftX),
            yMin: Math.min(fourCornersPosition.topLeftY, fourCornersPosition.topRightY),
            xMax: Math.max(fourCornersPosition.topRightX, fourCornersPosition.bottomRightX),
            yMax: Math.max(fourCornersPosition.bottomLeftY, fourCornersPosition.bottomRightY),
        };

        const { elem, width, height } = await makeRenderReadySVGElement(
            graph.current,
            isAttachSelected,
            isSystemFontsOnly,
            languages,
            svgVersion,
            customViewBox
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
                <MenuItem icon={<MdSave />} onClick={() => handleDownloadJson()}>
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

                        <Accordion allowToggle mt={4}>
                            <AccordionItem>
                                <AccordionButton>
                                    <Box flex="1" textAlign="left">
                                        Advanced options
                                    </Box>
                                    <AccordionIcon />
                                </AccordionButton>
                                <AccordionPanel pb={4}>
                                    <Box mb={4} p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md">
                                        <Text fontSize="sm" fontWeight="bold" mb={1}>
                                            Current canvas dimensions
                                        </Text>
                                        <Text fontSize="sm">
                                            Width: {Math.abs(fourCornersPosition.topRightX - fourCornersPosition.topLeftX).toFixed(1)} | 
                                            Height: {Math.abs(fourCornersPosition.bottomLeftY - fourCornersPosition.topLeftY).toFixed(1)}
                                        </Text>
                                    </Box>
                                    <FormControl mb={4}>
                                        <FormLabel>Center node</FormLabel>
                                        <Input
                                            list="node-options"
                                            value={selectedNodeId}
                                            onChange={e => setSelectedNodeId(e.target.value)}
                                            placeholder="Enter node ID or select from list"
                                        />
                                        <datalist id="node-options">
                                            {Object.entries(nodeOptions).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </datalist>
                                    </FormControl>
                                    <RmgFields fields={advancedFields} />
                                    <Box mt={4}>
                                        <Text fontWeight="bold" mb={2}>
                                            Position controls
                                        </Text>
                                        <RmgFields fields={positionFields} />
                                    </Box>
                                </AccordionPanel>
                            </AccordionItem>
                        </Accordion>

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
                                        <Trans
                                            i18nKey="header.download.disabledScaleOptionsSolution"
                                            components={{
                                                link1: (
                                                    <Link
                                                        color="teal.500"
                                                        textDecoration="underline"
                                                        cursor="pointer"
                                                        href="https://afdian.com/item/9c8b220c614311efab2d52540025c377"
                                                        target="_blank"
                                                    />
                                                ),
                                                link2: (
                                                    <Link
                                                        color="teal.500"
                                                        textDecoration="underline"
                                                        cursor="pointer"
                                                        href={getTauriUrl()}
                                                    />
                                                ),
                                            }}
                                        />
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
