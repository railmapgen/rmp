import React from 'react';
import { RmgCircularSlider, RmgSelect } from '@railmapgen/rmg-components';
import { StationAttributes, StationType } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { setRefreshNodes } from '../../../redux/runtime/runtime-slice';

const DEFAULT_ROTATE_OPTIONS = {
    0: '0',
    45: '45',
    90: '90',
    135: '135',
    180: '180',
    225: '225',
    270: '270',
    315: '315',
};

type RotatableStationAttributes = StationAttributes & { rotate?: number };

interface RotateFieldProps<T extends RotatableStationAttributes> {
    type: StationType;
    defaultAttributes: T;
    getNextAttributes?: (attributes: T) => T;
    rotateSelect?: {
        value: number | string;
        options: Record<string, string>;
        disabledOptions: string[];
    };
}

export const RotateField = <T extends RotatableStationAttributes>(props: RotateFieldProps<T>) => {
    const { type, defaultAttributes, getNextAttributes, rotateSelect } = props;
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;
    const mapEnabled = useRootSelector(state => state.param.present.mapEnabled);
    const graph = React.useRef(window.graph);

    const attr: T =
        selectedFirst &&
        graph.current.hasNode(selectedFirst) &&
        graph.current.getNodeAttribute(selectedFirst, 'type') === type
            ? (graph.current.getNodeAttribute(selectedFirst, type)! as T)
            : defaultAttributes;
    const rotate = attr.rotate ?? 0;

    const updateGraph = (value: string | number) => {
        if (
            !selectedFirst ||
            !graph.current.hasNode(selectedFirst) ||
            graph.current.getNodeAttribute(selectedFirst, 'type') !== type
        ) {
            return false;
        }

        const nextRotate = Number(value);
        const nextAttributes = { ...attr, rotate: nextRotate } as T;
        if (rotateSelect) {
            delete nextAttributes.preciseNameOffsets;
        }
        graph.current.mergeNodeAttributes(selectedFirst, {
            [type]: getNextAttributes?.(nextAttributes) ?? nextAttributes,
        });
        return true;
    };

    const handlePreview = (value: number) => {
        if (updateGraph(value)) {
            dispatch(setRefreshNodes());
        }
    };

    const handleCommit = (value: string | number) => {
        if (updateGraph(value)) {
            dispatch(saveGraph(graph.current.export()));
            dispatch(setRefreshNodes());
        }
    };

    return mapEnabled ? (
        <RmgCircularSlider
            defaultValue={rotate}
            min={0}
            max={359}
            snapStep={45}
            snapThreshold={1}
            size={150}
            onChange={handlePreview}
            onChangeEnd={handleCommit}
        />
    ) : (
        <RmgSelect
            defaultValue={rotateSelect?.value ?? rotate}
            options={rotateSelect?.options ?? DEFAULT_ROTATE_OPTIONS}
            disabledOptions={rotateSelect?.disabledOptions ?? []}
            onChange={e => handleCommit(e.target.value)}
        />
    );
};
