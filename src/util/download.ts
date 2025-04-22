import { MultiDirectedGraph } from 'graphology';
import { FacilitiesType } from '../components/svgs/nodes/facilities';
import { languageToFontsCss } from '../components/svgs/nodes/text';
import { EdgeAttributes, GraphAttributes, NodeAttributes, NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import i18n from '../i18n/config';
import { FONTS_CSS, makeBase64EncodedFontsStyle } from './fonts';
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
 * @param generateRMPInfo Whether to call `generateRmpInfo`.
 * @param useSystemFonts Whether to add font-family to elements with fonts classes.
 * @returns The all in one SVGSVGElement and the size of canvas.
 */
export const makeRenderReadySVGElement = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    generateRMPInfo: boolean,
    useSystemFonts: boolean,
    svgVersion: 1.1 | 2
) => {
    // get the minimum and maximum of the graph
    const { xMin, yMin, xMax, yMax } = calculateCanvasSize(graph);
    const [width, height] = [xMax - xMin, yMax - yMin];

    const elem = document.getElementById('canvas')!.cloneNode(true) as SVGSVGElement;
    // append rmp info if user does not want to share rmp info
    if (!generateRMPInfo) elem.appendChild(await generateRmpInfo(xMax - 400, yMax - 120));
    // reset svg viewBox to display all the nodes in the graph
    // otherwise the later drawImage won't be able to show all of them
    elem.setAttribute('viewBox', `${xMin} ${yMin} ${width} ${height}`);
    // Chrome will stretch the image if the following width and height are not set
    elem.setAttribute('width', width.toString());
    elem.setAttribute('height', height.toString());
    // copy attributes from css to each elem in the newly cloned svg
    // this is necessary as styles stated in css will be missing in the cloned svg dom
    // only styles other than fonts need to be stated here, fonts are handled below
    Object.entries({
        '.rmp-name-outline': ['paint-order', 'stroke', 'stroke-linejoin'],
    }).forEach(([className, styleSet]) => {
        const e = document.querySelector(className);
        if (e === null) return; // no element in the canvas uses this class
        const style = window.getComputedStyle(e);
        elem.querySelectorAll(className).forEach(el => {
            // Polyfill paint-order used in .rmp-name-outline for Adobe Illustrator.
            // This is an SVG 2 specification and SVG 2 is not finalized or released yet.
            // https://www.w3.org/TR/SVG2/painting.html#PaintOrder
            if (className === '.rmp-name-outline' && svgVersion === 1.1) {
                const upperEl = el.insertAdjacentElement('afterend', el.cloneNode(true) as SVGElement);
                if (upperEl) {
                    upperEl.classList.remove(className.slice(1));
                    if (upperEl.classList.length === 0) el.removeAttribute('class');
                    upperEl.removeAttribute('stroke-width');
                }
            }
            styleSet.forEach(styleName => {
                el.setAttribute(styleName, style.getPropertyValue(styleName));
            });
            el.classList.remove(className.slice(1));
            if (el.classList.length === 0) el.removeAttribute('class');
        });
    });
    // Remove masks that only help users find and click the elements, but should not be shown on final export.
    elem.querySelectorAll('[fill="url(#opaque)"]').forEach(el => {
        el.remove();
    });
    // remove virtual nodes and text hinting rect
    // remove the overlay elements that are used for event handling or id info
    elem.querySelectorAll('.removeMe').forEach(el => {
        el.remove();
    });

    const nodesExist = findNodesExist(graph);

    await loadFonts(elem, graph, nodesExist, useSystemFonts);

    await loadFacilitiesSvg(elem, graph, nodesExist);

    return { elem, width, height };
};

const loadFonts = async (
    elem: SVGSVGElement,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodesExist: ReturnType<typeof findNodesExist>,
    useSystemFonts: boolean
) => {
    // TODO: add fonts by language (mtr__zh/mtr__en/mrt/jreast_ja) instead of node type
    // this will reduce the fonts loaded as some node types (e.g. mtr) have two languages which might import two fonts
    const fontsByNodeType: Set<NodeType> = new Set();
    // find additional fonts imported from stations
    (Object.keys(FONTS_CSS) as NodeType[])
        .filter(nodeType => nodesExist[nodeType])
        .forEach(nodeType => fontsByNodeType.add(nodeType));
    // find additional fonts from text nodes
    graph
        .filterNodes((node, attr) => node.startsWith('misc_node_') && attr.type === MiscNodeType.Text)
        .map(node => graph.getNodeAttribute(node, MiscNodeType.Text)!.language)
        .map(lng => languageToFontsCss[lng])
        // default fonts do not exist in FONTS_CSS but will be loaded definitely
        .filter(nodeType => nodeType !== StationType.ShmetroBasic)
        .forEach(nodeType => fontsByNodeType.add(nodeType));
    if (!useSystemFonts) {
        // add rmp-name__zh and rmp-name__en every time as they are the default fonts
        const s = document.createElement('style');
        for (let i = 0; i < document.styleSheets.length; i = i + 1) {
            if (document.styleSheets[i].href?.endsWith('styles/fonts.css')) {
                s.textContent = [...document.styleSheets[i].cssRules].map(_ => _.cssText).join('\n');
                break;
            }
        }
        elem.prepend(s);

        // add additional fonts to the final svg in encoded base64 format
        await Promise.all(
            [...fontsByNodeType.values()]
                .map(nodeType => FONTS_CSS[nodeType]!)
                .map(async ({ cssName, cssFont }) => {
                    try {
                        elem.prepend(await makeBase64EncodedFontsStyle(cssFont, cssName));
                    } catch (err) {
                        alert('Failed to load fonts. Fonts in the exported PNG will be missing.');
                        console.error(err);
                    }
                })
        );
    } else {
        // remove fonts class from the text element
        ['.rmp-name__zh', '.rmp-name__en'].forEach(className => {
            elem.querySelectorAll(className).forEach(el => {
                el.classList.remove(className.slice(1));
                if (el.classList.length === 0) el.removeAttribute('class');
            });
        });
        fontsByNodeType.forEach(nodeType => {
            FONTS_CSS[nodeType]!.className.forEach(className => {
                elem.querySelectorAll(className).forEach(el => {
                    el.classList.remove(className.slice(1));
                    if (el.classList.length === 0) el.removeAttribute('class');
                });
            });
        });
    }
};

const loadFacilitiesSvg = async (
    elem: SVGSVGElement,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodesExist: ReturnType<typeof findNodesExist>
) => {
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
            (await Promise.all(facilitiesTypesExists.map(async t => await fetch(`images/facilities/${t}.svg`)))).map(
                rep => rep.text()
            )
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
};

const generateRmpInfo = async (x: number, y: number) => {
    const info = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    info.setAttribute('transform', `translate(${x}, ${y})scale(2)`);

    const logoSVGRep = await fetch('logo.svg');
    const logoSVG = await logoSVGRep.text();
    const temp = document.createElement('div');
    temp.innerHTML = logoSVG;
    const svg = temp.querySelector('svg')!;
    const logo = document.createElement('g');
    logo.setAttribute('transform', `translate(-60, -25)scale(0.1)`);
    logo.setAttribute('font-family', 'Arial, sans-serif');
    logo.innerHTML = svg.innerHTML;
    info.appendChild(logo);

    const rmp = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rmp.setAttribute('font-family', 'Arial, sans-serif');
    rmp.setAttribute('font-size', '16');
    const appName = i18n.t('Rail Map Painter');
    rmp.appendChild(document.createTextNode(appName));

    const link = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    link.setAttribute('font-family', 'Arial, sans-serif');
    link.setAttribute('font-size', '10');
    link.setAttribute('y', '10');
    const origin = window.location.origin;
    let url = 'https://railmapgen.org/';
    if (origin.includes('github')) url = 'https://railmapgen.github.io/';
    else if (origin.includes('gitlab')) url = 'https://railmapgen.gitlab.io/';
    url += '?app=rmp';
    link.appendChild(document.createTextNode(url));

    info.appendChild(logo);
    info.appendChild(rmp);
    info.appendChild(link);

    return info;
};
