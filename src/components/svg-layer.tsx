import React from 'react';
import { LineId, MiscNodeId, NodeId, StnId } from '../constants/constants';
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
    handlePointerDown: (node: NodeId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerMove: (node: NodeId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerUp: (node: NodeId, e: React.PointerEvent<SVGElement>) => void;
    handleEdgePointerDown: (edge: LineId, e: React.PointerEvent<SVGElement>) => void;
}

// HELP NEEDED: Why component is not this type?
type StyleComponent = React.FC<
    LineStyleComponentProps<NonNullable<ExternalLineStyleAttributes[keyof ExternalLineStyleAttributes]>>
>;

const SvgLayer = React.memo(
    (props: SvgLayerProps) => {
        const { elements, handlePointerDown, handlePointerMove, handlePointerUp, handleEdgePointerDown } = props;

        const layers = Object.fromEntries(
            Array.from({ length: 21 }, (_, i) => [
                i - 10,
                { pre: [] as React.JSX.Element[], main: [] as React.JSX.Element[], post: [] as React.JSX.Element[] },
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
                    layers[element.line!.attr.zIndex].pre.push(
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
                }

                const StyleComponent = (lineStyles[style]?.component ?? UnknownLineStyle) as StyleComponent;
                layers[element.line!.attr.zIndex].main.push(
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

                const PostStyleComponent = lineStyles[style]?.postComponent as StyleComponent | undefined;
                if (PostStyleComponent) {
                    layers[element.line!.attr.zIndex].post.push(
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
                }
            } else if (element.type === 'station') {
                const attr = element.station!;
                const type = attr.type as StationType;

                const PreStationComponent = allStations[type]?.preComponent;
                if (PreStationComponent) {
                    layers[element.station!.zIndex].pre.push(
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
                }

                const StationComponent = allStations[type]?.component ?? UnknownNode;
                layers[element.station!.zIndex].main.push(
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

                const PostStationComponent = allStations[type]?.postComponent;
                if (PostStationComponent) {
                    layers[element.station!.zIndex].post.push(
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
                }
            } else if (element.type === 'misc-node') {
                const attr = element.miscNode!;
                const type = attr.type as MiscNodeType;

                const PreMiscNodeComponent = miscNodes[type]?.preComponent;
                if (PreMiscNodeComponent) {
                    layers[element.miscNode!.zIndex].pre.push(
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
                }

                const MiscNodeComponent = miscNodes[type]?.component ?? UnknownNode;
                layers[element.miscNode!.zIndex].main.push(
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

                const PostMiscNodeComponent = miscNodes[type]?.postComponent;
                if (PostMiscNodeComponent) {
                    layers[element.miscNode!.zIndex].post.push(
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
                }
            }
        }

        const jsxElements = Array.from({ length: 21 }, (_, i) => (i - 10).toString())
            .map(zIndex => [...layers[zIndex].pre, ...layers[zIndex].main, ...layers[zIndex].post])
            .flat();

        return jsxElements;
    },
    (prevProps, nextProps) => prevProps.elements === nextProps.elements
);

export default SvgLayer;
