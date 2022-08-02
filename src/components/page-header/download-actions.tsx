import React from 'react';
import { IconButton, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { MdDownload } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { calculateCanvasSize } from '../../util/helpers';

export default function DownloadActions() {
    const { t } = useTranslation();

    const graph = React.useRef(window.graph);

    const handleDownloadJson = () => {
        downloadAs(`RMP_${new Date().valueOf()}.json`, 'application/json', JSON.stringify(graph.current.export()));
    };
    // thanks to this article that includes every steps in converting svg to png
    // https://levelup.gitconnected.com/draw-an-svg-to-canvas-and-download-it-as-image-in-javascript-f7f7713cf81f
    const handleDownload = () => {
        // get the minimum and maximum of the graph
        const { xMin, yMin, xMax, yMax } = calculateCanvasSize(graph.current);
        const [width, height] = [xMax - xMin, yMax - yMin];

        const elem = document.getElementById('canvas')!.cloneNode(true) as SVGSVGElement;
        // remove virtual nodes
        [...elem.children].filter(e => e.id.startsWith('virtual_misc_node_virtual')).forEach(e => elem.removeChild(e));
        // transform svg to contain all the nodes in the graph
        // otherwise the later drawImage won't be able to display them all
        elem.setAttribute('viewBox', `${xMin} ${yMin} ${width} ${height}`);
        // append to document to render the svg
        document.body.appendChild(elem);
        // convert it to blob and url for drawing to canvas
        const blob = new Blob([elem.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
        const blobURL = window.URL.createObjectURL(blob);
        // release after use
        document.body.removeChild(elem);

        // create canvas to be drawn on
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(blob => downloadBlobAs(`RMP_${new Date().valueOf()}.png`, blob!), 'image/png');
        };
        img.src = blobURL;

        window.URL.revokeObjectURL(blobURL);
    };

    return (
        <Menu>
            <MenuButton as={IconButton} size="sm" variant="ghost" icon={<MdDownload />} />
            <MenuList>
                <MenuItem onClick={handleDownloadJson}>{t('header.download.config')}</MenuItem>
                <MenuItem onClick={handleDownload}>{t('header.download.png')}</MenuItem>
            </MenuList>
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
