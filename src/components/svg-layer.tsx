import React from 'react';
import { Id, LineId, MiscNodeId, StnId } from '../constants/constants';
import { ExternalLineStyleAttributes, LineStyleComponentProps } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { Element } from '../util/process-elements';
import { UnknownLineStyle, UnknownNode } from './svgs/common/unknown';
import { lineStyles } from './svgs/lines/lines';
import miscNodes from './svgs/nodes/misc-nodes';
import { default as allStations } from './svgs/stations/stations';

interface SvgLayerProps {
    elements: Element[];
    selected: Set<Id>;
    handlePointerDown: (node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerMove: (node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerUp: (node: StnId | MiscNodeId, e: React.PointerEvent<SVGElement>) => void;
    handleEdgePointerDown: (edge: LineId, e: React.PointerEvent<SVGElement>) => void;
}

// HELP NEEDED: Why component is not this type?
type StyleComponent = React.FC<
    LineStyleComponentProps<NonNullable<ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]>>
>;

const SvgLayer = React.memo(
    (props: SvgLayerProps) => {
        const { elements, selected, handlePointerDown, handlePointerMove, handlePointerUp, handleEdgePointerDown } =
            props;

        const layers = Object.fromEntries(
            Array.from({ length: 21 }, (_, i) => [
                i - 10,
                { pre: [] as JSX.Element[], main: [] as JSX.Element[], post: [] as JSX.Element[] },
            ])
        );
        for (const element of elements) {
            if (element.type === 'line') {
                const type = element.line!.attr.type;
                const style = element.line!.attr.style;
                const styleAttrs = element.line!.attr[style] as NonNullable<
                    ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]
                >;

                const PreStyleComponent = lineStyles[style]?.preComponent as StyleComponent | undefined;
                if (PreStyleComponent) {
                    const isSelected = selected.has(element.id);
                    const preComponent = (
                        <PreStyleComponent
                            key={`${element.id}.pre`}
                            id={element.id as LineId}
                            type={type}
                            path={element.line!.path}
                            styleAttrs={styleAttrs}
                            newLine={false}
                            handlePointerDown={handleEdgePointerDown}
                        />
                    );
                    layers[element.line!.attr.zIndex].pre.push(
                        <g key={`${element.id}.pre-glow`} filter={isSelected ? 'url(#selected-glow)' : undefined}>
                            {preComponent}
                        </g>
                    );
                }

                const StyleComponent = (lineStyles[style]?.component ?? UnknownLineStyle) as StyleComponent;
                const isSelected = selected.has(element.id);
                const component = (
                    <StyleComponent
                        key={element.id}
                        id={element.id as LineId}
                        type={type}
                        path={element.line!.path}
                        styleAttrs={styleAttrs}
                        newLine={false}
                        handlePointerDown={handleEdgePointerDown}
                    />
                );

                layers[element.line!.attr.zIndex].main.push(
                    <g key={`${element.id}-glow`} filter={isSelected ? 'url(#selected-glow)' : undefined}>
                        {component}
                    </g>
                );

                const PostStyleComponent = lineStyles[style]?.postComponent as StyleComponent | undefined;
                if (PostStyleComponent) {
                    const isSelected = selected.has(element.id);
                    const postComponent = (
                        <PostStyleComponent
                            key={`${element.id}.post`}
                            id={element.id as LineId}
                            type={type}
                            path={element.line!.path}
                            styleAttrs={styleAttrs}
                            newLine={false}
                            handlePointerDown={handleEdgePointerDown}
                        />
                    );
                    layers[element.line!.attr.zIndex].post.push(
                        <g key={`${element.id}.post-glow`} filter={isSelected ? 'url(#selected-glow)' : undefined}>
                            {postComponent}
                        </g>
                    );
                }
            } else if (element.type === 'station') {
                const attr = element.station!;
                const type = attr.type as StationType;

                const PreStationComponent = allStations[type]?.preComponent;
                if (PreStationComponent) {
                    const isSelected = selected.has(element.id);
                    const preComponent = (
                        <PreStationComponent
                            key={`${element.id}.pre`}
                            id={element.id as StnId}
                            x={attr.x}
                            y={attr.y}
                            attrs={attr}
                            handlePointerDown={handlePointerDown}
                            handlePointerMove={handlePointerMove}
                            handlePointerUp={handlePointerUp}
                        />
                    );
                    layers[element.station!.zIndex].pre.push(
                        <g key={`${element.id}.pre-glow`} filter={isSelected ? 'url(#selected-glow)' : undefined}>
                            {preComponent}
                        </g>
                    );
                }

                const StationComponent = allStations[type]?.component ?? UnknownNode;
                const isSelected = selected.has(element.id);
                const component = (
                    <StationComponent
                        key={element.id}
                        id={element.id as StnId}
                        x={attr.x}
                        y={attr.y}
                        attrs={attr}
                        handlePointerDown={handlePointerDown}
                        handlePointerMove={handlePointerMove}
                        handlePointerUp={handlePointerUp}
                    />
                );

                layers[element.station!.zIndex].main.push(
                    <g key={`${element.id}-glow`} filter={isSelected ? 'url(#selected-glow)' : undefined}>
                        {component}
                    </g>
                );

                const PostStationComponent = allStations[type]?.postComponent;
                if (PostStationComponent) {
                    const isSelected = selected.has(element.id);
                    const postComponent = (
                        <PostStationComponent
                            key={`${element.id}.post`}
                            id={element.id as StnId}
                            x={attr.x}
                            y={attr.y}
                            attrs={attr}
                            handlePointerDown={handlePointerDown}
                            handlePointerMove={handlePointerMove}
                            handlePointerUp={handlePointerUp}
                        />
                    );
                    layers[element.station!.zIndex].post.push(
                        <g key={`${element.id}.post-glow`} filter={isSelected ? 'url(#selected-glow)' : undefined}>
                            {postComponent}
                        </g>
                    );
                }
            } else if (element.type === 'misc-node') {
                const attr = element.miscNode!;
                const type = attr.type as MiscNodeType;

                const PreMiscNodeComponent = miscNodes[type]?.preComponent;
                if (PreMiscNodeComponent) {
                    const isSelected = selected.has(element.id);
                    const preComponent = (
                        <PreMiscNodeComponent
                            key={`${element.id}.pre`}
                            id={element.id as MiscNodeId}
                            x={attr.x}
                            y={attr.y}
                            // @ts-expect-error
                            attrs={attr[type]}
                            handlePointerDown={handlePointerDown}
                            handlePointerMove={handlePointerMove}
                            handlePointerUp={handlePointerUp}
                        />
                    );
                    layers[element.miscNode!.zIndex].pre.push(
                        <g key={`${element.id}.pre-glow`} filter={isSelected ? 'url(#selected-glow)' : undefined}>
                            {preComponent}
                        </g>
                    );
                }

                const MiscNodeComponent = miscNodes[type]?.component ?? UnknownNode;
                const isSelected = selected.has(element.id);
                const component = (
                    <MiscNodeComponent
                        key={element.id}
                        id={element.id as MiscNodeId}
                        x={attr.x}
                        y={attr.y}
                        // @ts-expect-error
                        attrs={attr[type]}
                        handlePointerDown={handlePointerDown}
                        handlePointerMove={handlePointerMove}
                        handlePointerUp={handlePointerUp}
                    />
                );

                layers[element.miscNode!.zIndex].main.push(
                    <g key={`${element.id}-glow`} filter={isSelected ? 'url(#selected-glow)' : undefined}>
                        {component}
                    </g>
                );

                const PostMiscNodeComponent = miscNodes[type]?.postComponent;
                if (PostMiscNodeComponent) {
                    const isSelected = selected.has(element.id);
                    const postComponent = (
                        <PostMiscNodeComponent
                            key={`${element.id}.post`}
                            id={element.id as MiscNodeId}
                            x={attr.x}
                            y={attr.y}
                            // @ts-expect-error
                            attrs={attr[type]}
                            handlePointerDown={handlePointerDown}
                            handlePointerMove={handlePointerMove}
                            handlePointerUp={handlePointerUp}
                        />
                    );
                    layers[element.miscNode!.zIndex].post.push(
                        <g key={`${element.id}.post-glow`} filter={isSelected ? 'url(#selected-glow)' : undefined}>
                            {postComponent}
                        </g>
                    );
                }
            }
        }

        const jsxElements = Array.from({ length: 21 }, (_, i) => (i - 10).toString())
            .map(zIndex => [...layers[zIndex].pre, ...layers[zIndex].main, ...layers[zIndex].post])
            .flat();

        return jsxElements;
    },
    (prevProps, nextProps) => prevProps.elements === nextProps.elements && prevProps.selected === nextProps.selected
);

export default SvgLayer;
