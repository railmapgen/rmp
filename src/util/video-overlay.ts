import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, Theme } from '../constants/constants';
import { LineDefinition, VideoLineLabel } from '../constants/line-definitions';
import { TimelineLabelEntry } from '../constants/timeline';

type VideoGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

export interface VideoLineAnnotation {
    year: string;
    monthDay: string;
    name: [string, string];
    color: string;
}

/** A Timeline can customize labels without recoloring its map or changing opening order. */
export const getVideoLineLabel = (graph: VideoGraph, line: LineDefinition): VideoLineLabel => {
    const edgeId = line.edgeIds.find(id => graph.hasEdge(id));
    const attrs = edgeId ? graph.getEdgeAttributes(edgeId) : undefined;
    const theme = attrs ? (attrs[attrs.style] as { color?: Theme } | undefined)?.color : undefined;
    const label = line.videoLabel;
    return {
        name: [...(label?.name ?? line.name)],
        lineNumber: label?.lineNumber ?? line.lineNumber,
        openingDate: label?.openingDate ?? line.openingDate,
        color: label?.color ?? theme?.[2] ?? '#64748b',
    };
};

export const getVideoLineAnnotation = (graph: VideoGraph, edgeId: LineId): VideoLineAnnotation | undefined => {
    const line: LineDefinition | undefined = graph
        .getAttribute('lineDefinitions')
        ?.find(line => line.edgeIds.includes(edgeId));
    if (!line || !graph.hasEdge(edgeId)) return;
    const label = getVideoLineLabel(graph, line);
    // Use this edge's color for imported labels, including legacy multi-color lines.
    const attrs = graph.getEdgeAttributes(edgeId);
    const theme = (attrs[attrs.style] as { color?: Theme } | undefined)?.color;
    const openingDate = /^\d{4}-\d{2}-\d{2}$/.test(label.openingDate) ? label.openingDate : '';
    return {
        year: openingDate.slice(0, 4),
        monthDay: openingDate.slice(5),
        name: [label.name[0].trim() || label.lineNumber.trim(), label.name[1].trim()],
        color: line.videoLabel?.color ?? theme?.[2] ?? '#64748b',
    };
};

/** Screen-space typography: the same card stays the same size as the camera follows the map. */
export const createVideoLineOverlay = (
    annotation: VideoLineAnnotation | undefined,
    settings: { showYear: boolean; showLineName: boolean },
    viewBox: { x: number; y: number; width: number; height: number },
    labels: readonly Pick<TimelineLabelEntry, 'id' | 'text'>[] = [],
    totalLength = ''
): SVGGElement | undefined => {
    const year = settings.showYear ? (annotation?.year ?? '') : '';
    const monthDay = year ? (annotation?.monthDay ?? '') : '';
    const names = settings.showLineName ? (annotation?.name ?? ['', '']) : ['', ''];
    const visibleLabels = labels.filter(label => label.text.trim());
    if (!year && !names.some(Boolean) && !visibleLabels.length && !totalLength) return;
    const ns = 'http://www.w3.org/2000/svg';
    const create = (tag: string, attrs: Record<string, string | number>) => {
        const elem = document.createElementNS(ns, tag);
        Object.entries(attrs).forEach(([name, value]) => elem.setAttribute(name, String(value)));
        return elem;
    };
    const panel = create('g', {
        id: 'rmp_video_line_overlay',
        'aria-label': [year, monthDay, ...names, totalLength, ...visibleLabels.map(label => label.text)]
            .filter(Boolean)
            .join(' · '),
        'pointer-events': 'none',
        transform: `translate(${viewBox.x}, ${viewBox.y}) scale(${viewBox.width / 1280})`,
        'font-family': "Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    }) as SVGGElement;
    // Conservative character widths keep long bilingual names inside the video frame.
    const textWidth = (text: string, size: number) =>
        Array.from(text).reduce((width, char) => width + size * (char.charCodeAt(0) > 127 ? 1 : 0.62), 0);
    const mainName = names[0] || names[1];
    const secondaryName = names[0] ? names[1] : '';
    const dateHeight = monthDay ? 33 : 0;
    const nameTop = year ? 113 + dateHeight : 48;
    const nameHeight = secondaryName ? 65 : 39;
    const metadataWidth = Math.min(690, Math.max(160, textWidth(mainName, 28) + 58, textWidth(secondaryName, 16) + 58));
    const width = Math.min(
        690,
        Math.max(
            visibleLabels.length ? 220 : 160,
            metadataWidth,
            textWidth(totalLength, 24) + 40,
            ...visibleLabels.flatMap(label => label.text.split(/\r?\n/).map(line => textWidth(line, 20) + 40))
        )
    );
    const hasMetadata = !!year || !!mainName || !!totalLength;
    const metadataHeight =
        year && mainName ? 169 + dateHeight : year ? 86 + dateHeight : mainName ? nameHeight + 30 : 0;
    const baseHeight = metadataHeight + (totalLength ? (metadataHeight ? 40 : 56) : 0);
    const wrap = (line: string) => {
        const rows: string[] = [];
        let row = '';
        for (const char of Array.from(line)) {
            if (row && textWidth(row + char, 20) > width - 40) {
                const space = row.lastIndexOf(' ');
                if (space > 0) {
                    rows.push(row.slice(0, space));
                    row = row.slice(space + 1) + char;
                } else {
                    rows.push(row);
                    row = char.trimStart();
                }
            } else row += char;
        }
        rows.push(row);
        return rows;
    };
    const labelRows = visibleLabels.flatMap(label =>
        label.text
            .split(/\r?\n/)
            .flatMap(wrap)
            .map(text => ({ id: label.id, text }))
    );
    const labelPadding = hasMetadata ? 28 : 20;
    const maxHeight = Math.max(80, (viewBox.height / viewBox.width) * 1280 - 54);
    const maxRows = Math.max(1, Math.floor((maxHeight - baseHeight - labelPadding) / 28));
    const rows = labelRows.slice(0, maxRows);
    if (labelRows.length > maxRows) rows[rows.length - 1].text = rows[rows.length - 1].text.replace(/.{0,3}$/, '…');
    const height = baseHeight + (rows.length ? rows.length * 28 + labelPadding : 0);
    panel.append(
        create('rect', { x: 30, y: 27, width, height, rx: 18, fill: '#ffffff', 'fill-opacity': 0.93 }),
        create('rect', {
            x: 30,
            y: 27,
            width,
            height,
            rx: 18,
            fill: 'none',
            stroke: '#cbd5e1',
            'stroke-opacity': 0.42,
        })
    );
    if (year) {
        const yearWidth = textWidth(year, 52);
        // Labels can enlarge the panel; the original date block keeps its screen position.
        const dateRight = 30 + (metadataWidth + yearWidth) / 2;
        const text = create('text', {
            x: dateRight,
            y: 91,
            fill: '#172033',
            'font-size': 52,
            'font-weight': 700,
            'text-anchor': 'end',
            'font-variant-numeric': 'tabular-nums',
            textLength: yearWidth,
            lengthAdjust: 'spacing',
        });
        text.textContent = year;
        panel.append(text);
        if (monthDay) {
            const date = create('text', {
                x: dateRight,
                y: 120,
                fill: '#5c687a',
                'font-size': 22,
                'font-weight': 600,
                'text-anchor': 'end',
                'font-variant-numeric': 'tabular-nums',
            });
            date.textContent = monthDay;
            panel.append(date);
        }
    }
    if (mainName) {
        panel.append(
            create('rect', { x: 49, y: nameTop, width: 7, height: nameHeight, rx: 3.5, fill: annotation!.color })
        );
        const main = create('text', {
            x: 69,
            y: nameTop + 28,
            fill: '#172033',
            'font-size': 28,
            'font-weight': 650,
        });
        main.textContent = mainName;
        if (textWidth(mainName, 28) > width - 58) {
            main.setAttribute('textLength', String(width - 58));
            main.setAttribute('lengthAdjust', 'spacingAndGlyphs');
        }
        panel.append(main);
        if (secondaryName) {
            const secondary = create('text', { x: 69, y: nameTop + 56, fill: '#5c687a', 'font-size': 16 });
            secondary.textContent = secondaryName;
            if (textWidth(secondaryName, 16) > width - 58) {
                secondary.setAttribute('textLength', String(width - 58));
                secondary.setAttribute('lengthAdjust', 'spacingAndGlyphs');
            }
            panel.append(secondary);
        }
    }
    if (totalLength) {
        const length = create('text', {
            x: 50,
            y: 27 + metadataHeight + (metadataHeight ? 25 : 36),
            fill: '#334155',
            'font-size': 24,
            'font-weight': 600,
            'font-variant-numeric': 'tabular-nums',
            'data-video-total-length': '',
        });
        length.textContent = totalLength;
        panel.append(length);
    }
    if (rows.length) {
        if (hasMetadata)
            panel.append(
                create('line', {
                    x1: 50,
                    x2: 30 + width - 20,
                    y1: 27 + baseHeight,
                    y2: 27 + baseHeight,
                    stroke: '#dbe2ea',
                })
            );
        rows.forEach((row, index) => {
            const text = create('text', {
                x: 50,
                y: 27 + baseHeight + (hasMetadata ? 28 : 32) + index * 28,
                fill: '#334155',
                'font-size': 20,
                'font-weight': 500,
                'data-video-label': row.id,
            });
            text.textContent = row.text;
            panel.append(text);
        });
    }
    return panel;
};
