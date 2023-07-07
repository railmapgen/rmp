import {
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
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdDownload, MdImage, MdOpenInNew, MdSave, MdShare } from 'react-icons/md';
import { Events } from '../../constants/constants';
import { MiscNodeType } from '../../constants/nodes';
import { StationType } from '../../constants/stations';
import store, { useRootSelector } from '../../redux';
import { downloadAs, downloadBlobAs } from '../../util/download';
import { getBase64FontFace } from '../../util/fonts';
import { calculateCanvasSize } from '../../util/helpers';
import { stringifyParam } from '../../util/save';
import { ToRmgModal } from './rmp-to-rmg';
import TermsAndConditionsModal from './terms-and-conditions';

export default function DownloadActions() {
    const { t } = useTranslation();
    const {
        telemetry: { project: isAllowProjectTelemetry },
    } = useRootSelector(state => state.app);
    const { nodeExists } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);
    const bgColor = useColorModeValue('white', 'gray.800');

    const [format, setFormat] = React.useState('png' as 'png' | 'svg');
    const formatOptions = {
        png: t('header.download.png'),
        svg: t('header.download.svg'),
    };
    const [scale, setScale] = React.useState(100);
    const scaleOptions = Object.fromEntries(
        [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500].map(v => [v, `${v}%`])
    );
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
    const [isAttachSelected, setIsAttachSelected] = React.useState(false);
    const [isTermsAndConditionsSelected, setIsTermsAndConditionsSelected] = React.useState(false);
    const [isToRmgOpen, setIsToRmgOpen] = React.useState(false);

    const handleDownloadJson = () => {
        if (isAllowProjectTelemetry)
            rmgRuntime.event(Events.DOWNLOAD_PARAM, { '#nodes': graph.current.order, '#edges': graph.current.size });
        const param = stringifyParam(store.getState().param);
        downloadAs(`RMP_${new Date().valueOf()}.json`, 'application/json', param);
    };
    // thanks to this article that includes every steps in converting svg to png
    // https://levelup.gitconnected.com/draw-an-svg-to-canvas-and-download-it-as-image-in-javascript-f7f7713cf81f
    const handleDownload = async () => {
        setIsDownloadModalOpen(false);
        if (isAllowProjectTelemetry)
            rmgRuntime.event(Events.DOWNLOAD_IMAGES, {
                numberOfNodes: graph.current.order,
                numberOfEdges: graph.current.size,
            });

        // get the minimum and maximum of the graph
        const { xMin, yMin, xMax, yMax } = calculateCanvasSize(graph.current);
        const [width, height] = [xMax - xMin, yMax - yMin];

        const elem = document.getElementById('canvas')!.cloneNode(true) as SVGSVGElement;
        // remove virtual nodes
        [...elem.children]
            .filter(
                e =>
                    graph.current.hasNode(e.id) && graph.current.getNodeAttribute(e.id, 'type') === MiscNodeType.Virtual
            )
            .forEach(e => elem.removeChild(e));
        // append rmp info if user does not want to share rmp info
        if (!isAttachSelected) elem.appendChild(generateRmpInfo(xMax - 400, yMax - 60));
        // reset svg viewBox to display all the nodes in the graph
        // otherwise the later drawImage won't be able to show all of them
        elem.setAttribute('viewBox', `${xMin} ${yMin} ${width} ${height}`);
        // Chrome will stretch the image if the following width and height are not set
        elem.setAttribute('width', width.toString());
        elem.setAttribute('height', height.toString());
        // copy attributes from css to each elem in the newly cloned svg
        // TODO: #274 copy all possible attributes using document.querySelectorAll('link'), this is hard to maintain
        Object.entries({
            '.rmp-name__zh': ['font-family'],
            '.rmp-name__en': ['font-family'],
            '.rmp-name__mtr__zh': ['font-family'],
            '.rmp-name__mtr__en': ['font-family'],
            '.rmp-name-station': ['paint-order', 'stroke', 'stroke-width'],
        }).forEach(([className, styleSet]) => {
            const e = document.querySelector(className);
            if (e === null) return; // no element in the canvas uses this class
            const style = window.getComputedStyle(e);
            elem.querySelectorAll(className).forEach(el => {
                styleSet.forEach(styleName => {
                    el.setAttribute(styleName, style.getPropertyValue(styleName));
                });
                el.classList.remove(className);
            });
        });

        if (nodeExists[StationType.MTR]) {
            try {
                const uris = await getBase64FontFace(elem);
                const s = document.createElement('style');
                s.textContent = uris.join('\n');
                elem.prepend(s);
            } catch (err) {
                alert('Failed to fonts. Fonts in the exported PNG will be missing.');
                console.error(err);
            }
        }

        if (format === 'svg') {
            downloadAs(`RMP_${new Date().valueOf()}.svg`, 'image/svg+xml', elem.outerHTML);
            return;
        }

        // append to document to render the svg
        document.body.appendChild(elem);
        // convert it to blob
        const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(elem.outerHTML)));
        // release after use
        document.body.removeChild(elem);

        // create canvas to be drawn on
        const canvas = document.createElement('canvas');
        const [canvasWidth, canvasHeight] = [(width * scale) / 100, (height * scale) / 100];
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        // set background, respect to dark mode
        if (!isTransparent) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            canvas.toBlob(blob => downloadBlobAs(`RMP_${new Date().valueOf()}.png`, blob!), 'image/png');
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
                <MenuItem icon={<MdImage />} onClick={() => setIsDownloadModalOpen(true)}>
                    {t('header.download.image')}
                </MenuItem>
                <MenuItem icon={<MdShare />} onClick={() => setIsToRmgOpen(true)}>
                    {t('header.download.2rmg')}
                </MenuItem>
            </MenuList>

            <Modal size="xl" isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.download.image')}</ModalHeader>
                    <ModalCloseButton />

                    <ModalBody>
                        <RmgFields fields={fields} />
                        {format === 'png' && <RmgFields fields={pngFields} />}
                        <br />
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
                                disabled={!isTermsAndConditionsSelected}
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

const generateRmpInfo = (x: number, y: number) => {
    const info = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    info.setAttribute('transform', `translate(${x}, ${y})scale(2)`);

    const logo = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    // FIXME: return after image is loaded
    // logo.setAttribute('href', 'https://uat-railmapgen.github.io/rmp/logo192.png');
    // logo.setAttribute('href', logoImg);
    logo.setAttribute('width', '40');
    logo.setAttribute('height', '40');
    logo.setAttribute('x', '-50');
    logo.setAttribute('y', '-20');

    const rmp = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rmp.setAttribute('font-family', 'Arial, sans-serif');
    rmp.setAttribute('font-size', '16');
    rmp.appendChild(document.createTextNode('Rail Map Painter'));

    const link = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    link.setAttribute('font-family', 'Arial, sans-serif');
    link.setAttribute('font-size', '10');
    link.setAttribute('y', '10');
    link.appendChild(document.createTextNode('https://railmapgen.github.io/rmp/'));

    info.appendChild(logo);
    info.appendChild(rmp);
    info.appendChild(link);

    return info;
};
