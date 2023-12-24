import { MultiDirectedGraph } from 'graphology';
import { FacilitiesType } from '../components/svgs/nodes/facilities';
import { EdgeAttributes, GraphAttributes, NodeAttributes, NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { FONTS_CSS, getBase64FontFace } from './fonts';
import { findNodesExist } from './graph';
import { calculateCanvasSize } from './helpers';

export const downloadAs = (filename: string, type: string, data: any) => {
    const blob = new Blob([data], { type });
    downloadBlobAs(filename, blob);
};

export const downloadBlobAs = (filename: string, blob: Blob) => {
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

/**
 * Clone the svg element and add fonts & missing external svg to it.
 * The returned svg should be opened and displayed correctly in any svg viewer.
 * @param graph The graph.
 * @param isAttachSelected Whether to call `generateRmpInfo`
 * @returns The all in one SVGSVGElement and the size of canvas.
 */
export const makeImages = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    isAttachSelected: boolean
) => {
    // get the minimum and maximum of the graph
    const { xMin, yMin, xMax, yMax } = calculateCanvasSize(graph);
    const [width, height] = [xMax - xMin, yMax - yMin];

    const elem = document.getElementById('canvas')!.cloneNode(true) as SVGSVGElement;
    // remove virtual nodes
    [...elem.children]
        .filter(e => graph.hasNode(e.id) && graph.getNodeAttribute(e.id, 'type') === MiscNodeType.Virtual)
        .forEach(e => elem.removeChild(e));
    // append rmp info if user does not want to share rmp info
    if (!isAttachSelected) elem.appendChild(generateRmpInfo(xMax - 400, yMax - 120));
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
        '.rmp-name__mtr__en': ['font-family', 'font-weight'],
        '.rmp-name__berlin': ['font-family'],
        '.rmp-name__mrt': ['font-family'],
        '.rmp-name-outline': ['paint-order', 'stroke', 'stroke-width', 'stroke-linejoin'],
    }).forEach(([className, styleSet]) => {
        const e = document.querySelector(className);
        if (e === null) return; // no element in the canvas uses this class
        const style = window.getComputedStyle(e);
        elem.querySelectorAll(className).forEach(el => {
            // Polyfill paint-order used in .rmp-name-outline for Adobe Illustrator.
            // This is an SVG 2 specification and SVG 2 is not finalized or released yet.
            // https://www.w3.org/TR/SVG2/painting.html#PaintOrder
            if (className === '.rmp-name-outline')
                el.insertAdjacentElement('afterend', el.cloneNode(true) as SVGElement);

            styleSet.forEach(styleName => {
                el.setAttribute(styleName, style.getPropertyValue(styleName));
            });
            el.classList.remove(className);
        });
    });
    // remove invisible mask
    elem.querySelectorAll('[fill="url(#opaque)"]').forEach(el => {
        el.setAttribute('fill', 'white');
        el.setAttribute('fill-opacity', '0');
    });

    const nodesExist = findNodesExist(graph);

    // load fonts
    for (const nodeType in FONTS_CSS) {
        if (nodesExist[nodeType as NodeType]) {
            try {
                const { className, cssFont, cssName, baseUrl } = FONTS_CSS[nodeType as NodeType]!;
                const uris = await getBase64FontFace(elem, className, cssFont, cssName, baseUrl);
                const s = document.createElement('style');
                s.textContent = uris.join('\n');
                elem.prepend(s);
            } catch (err) {
                alert('Failed to load fonts. Fonts in the exported PNG will be missing.');
                console.error(err);
            }
        }
    }

    // load facilities svg
    if (nodesExist[MiscNodeType.Facilities]) {
        const facilitiesNodes = graph.filterNodes((_, attr) => attr.type === MiscNodeType.Facilities);
        const facilitiesTypesToNodesMapping = Object.fromEntries(
            Object.values(FacilitiesType).map(k => [k, []])
        ) as unknown as {
            [key in FacilitiesType]: string[];
        };
        facilitiesNodes.forEach(node => {
            const type = graph.getNodeAttribute(node, MiscNodeType.Facilities)?.type;
            if (type) facilitiesTypesToNodesMapping[type].push(node);
        });
        const facilitiesTypesExists = Object.entries(facilitiesTypesToNodesMapping)
            .filter(([_, v]) => v.length > 0)
            .map(([k, _]) => k as FacilitiesType);
        const svgs = await Promise.all(
            (
                await Promise.all(
                    facilitiesTypesExists.map(
                        async t => await fetch(import.meta.env.BASE_URL + `/images/facilities/${t}.svg`)
                    )
                )
            ).map(rep => rep.text())
        );
        // extract the svg element from the svg file and append it as symbol to elem
        facilitiesTypesExists.forEach((t, i) => {
            const temp = document.createElement('div');
            temp.innerHTML = svgs[i];
            const svg = temp.querySelector('svg')!;

            const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
            for (const attr of svg.attributes) symbol.setAttribute(attr.name, attr.value);
            while (svg.firstChild) symbol.appendChild(svg.firstChild);
            svg.replaceWith(symbol);

            symbol.id = t;
            elem.appendChild(symbol);

            facilitiesTypesToNodesMapping[t].forEach(node => {
                const facilitiesNodeInThisType = elem.querySelector(`#${node}`);
                const imageElem = facilitiesNodeInThisType?.querySelector('image');
                if (imageElem) {
                    facilitiesNodeInThisType!.removeChild(imageElem);
                    const useElem = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                    useElem.setAttribute('href', `#${t}`);
                    // Safari needs width and height to be specified on the use element,
                    // or the element will use 100% for width and height.
                    // See issue #432 and https://stackoverflow.com/a/63671360
                    useElem.setAttribute('height', symbol.getAttribute('height')!);
                    useElem.setAttribute('width', symbol.getAttribute('width')!);
                    facilitiesNodeInThisType!.appendChild(useElem);
                }
            });

            temp.remove();
            // symbol and useElem will get garbage collected after elem.remove() in handleDownload
        });
    }

    return { elem, width, height };
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
