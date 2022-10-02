import React from 'react';
import {
    Button,
    Checkbox,
    HStack,
    Icon,
    IconButton,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    Link,
} from '@chakra-ui/react';
import { MdDownload, MdOpenInNew } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import store from '../../redux';
import { calculateCanvasSize } from '../../util/helpers';
import { stringifyParam } from '../../util/save';
import TermsAndConditionsModal from './terms-and-conditions';

export default function DownloadActions() {
    const { t } = useTranslation();

    const graph = React.useRef(window.graph);

    const [isTransparent, setIsTransparent] = React.useState(false);
    const [scale, setScale] = React.useState(100);
    const scaleOptions = Object.fromEntries(
        [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500].map(v => [v, `${v}%`])
    );
    const fields: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('header.download.transparent'),
            isChecked: isTransparent,
            onChange: setIsTransparent,
        },
        {
            type: 'select',
            label: t('header.download.scale'),
            value: scale,
            options: scaleOptions,
            onChange: value => setScale(value as number),
        },
    ];
    const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
    const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = React.useState(false);
    const [isAttachSelected, setIsAttachSelected] = React.useState(false);
    const [isTermsAndConditionsSelected, setIsTermsAndConditionsSelected] = React.useState(false);

    const handleDownloadJson = () => {
        const param = stringifyParam(store.getState().app);
        downloadAs(`RMP_${new Date().valueOf()}.json`, 'application/json', param);
    };
    // thanks to this article that includes every steps in converting svg to png
    // https://levelup.gitconnected.com/draw-an-svg-to-canvas-and-download-it-as-image-in-javascript-f7f7713cf81f
    const handleDownload = () => {
        setIsDownloadModalOpen(false);

        // get the minimum and maximum of the graph
        const { xMin, yMin, xMax, yMax } = calculateCanvasSize(graph.current);
        const [width, height] = [xMax - xMin, yMax - yMin];

        const elem = document.getElementById('canvas')!.cloneNode(true) as SVGSVGElement;
        // remove virtual nodes
        [...elem.children].filter(e => e.id.startsWith('misc_node_virtual')).forEach(e => elem.removeChild(e));
        // append rmp info if user does not want to share rmp info
        if (!isAttachSelected) elem.appendChild(generateRmpInfo(xMax - 600, yMax - 60));
        // transform svg to contain all the nodes in the graph
        // otherwise the later drawImage won't be able to display them all
        elem.setAttribute('viewBox', `${xMin} ${yMin} ${width} ${height}`);
        // Chrome will stretch the image if the following width and height are not set
        elem.setAttribute('width', width.toString());
        elem.setAttribute('height', height.toString());
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
        // white background
        if (!isTransparent) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        console.log(width, height, canvasWidth, canvasHeight);

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            canvas.toBlob(blob => downloadBlobAs(`RMP_${new Date().valueOf()}.png`, blob!), 'image/png');
        };
        img.src = src; // draw src on canvas
    };

    return (
        <Menu>
            <MenuButton as={IconButton} size="sm" variant="ghost" icon={<MdDownload />} />
            <MenuList>
                <MenuItem onClick={handleDownloadJson}>{t('header.download.config')}</MenuItem>
                <MenuItem onClick={() => setIsDownloadModalOpen(true)}>{t('header.download.png')}</MenuItem>
            </MenuList>

            <Modal size="xl" isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.download.png')}</ModalHeader>
                    <ModalCloseButton />

                    <ModalBody>
                        <RmgFields fields={fields} />
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
        </Menu>
    );
}

const downloadAs = (filename: string, type: string, data: any) => {
    const blob = new Blob([data], { type });
    downloadBlobAs(filename, blob);
};

const downloadBlobAs = (filename: string, blob: Blob) => {
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

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
    rmp.setAttribute('font-size', '20');
    rmp.appendChild(document.createTextNode('Rail Map Painter'));

    const link = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    link.setAttribute('y', '15');
    link.appendChild(document.createTextNode('https://railmapgen.github.io/rmp/'));

    info.appendChild(logo);
    info.appendChild(rmp);
    info.appendChild(link);

    return info;
};
