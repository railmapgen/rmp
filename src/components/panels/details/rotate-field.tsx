import React from 'react';
import { RmgCircularSlider, RmgSelect } from '@railmapgen/rmg-components';
import { StationAttributes, StationType } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshNodesThunk } from '../../../redux/runtime/runtime-slice';

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

interface RotateFieldProps {
    type: StationType;
    defaultAttributes: StationAttributes;
    rotateSelect?: {
        value: number | string;
        options: Record<string, string>;
        disabledOptions: string[];
    };
}

export const RotateField = (props: RotateFieldProps) => {
    const { type, defaultAttributes, rotateSelect } = props;
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;
    const projectType = useRootSelector(state => state.param.type);
    const isRealMap = projectType === 'map';
    const graph = React.useRef(window.graph);

    const hardRefresh = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
    }, [dispatch, refreshNodesThunk, saveGraph]);

    const attr =
        selectedFirst &&
        graph.current.hasNode(selectedFirst) &&
        graph.current.getNodeAttribute(selectedFirst, 'type') === type
            ? graph.current.getNodeAttribute(selectedFirst, type)!
            : defaultAttributes;
    const rotate = (attr as any).rotate ?? 0;

    const handleChange = (value: string | number) => {
        if (selectedFirst && graph.current.hasNode(selectedFirst)) {
            if (rotateSelect) {
                delete attr.preciseNameOffsets;
            }
            graph.current.mergeNodeAttributes(selectedFirst, { [type]: { ...attr, rotate: Number(value) } });
            hardRefresh();
        }
    };

    return isRealMap ? (
        <RmgCircularSlider
            defaultValue={rotate}
            min={0}
            max={359}
            snapStep={45}
            snapThreshold={1}
            size={150}
            onChange={handleChange}
        />
    ) : (
        <RmgSelect
            defaultValue={rotateSelect?.value ?? rotate}
            options={rotateSelect?.options ?? DEFAULT_ROTATE_OPTIONS}
            disabledOptions={rotateSelect?.disabledOptions ?? []}
            onChange={e => handleChange(e.target.value)}
        />
    );
};
