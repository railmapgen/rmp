import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../../constants/constants';
import { StationAttributes, StationType } from '../../../constants/stations';
import i18n from '../../../i18n/config';
import store, { createStore } from '../../../redux';
import { render } from '../../../test-utils';
import StationNameTranslateButton from './station-name-translate-button';

const realState = store.getState();

const createGraph = (enName: string) => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_test', {
        x: 0,
        y: 0,
        type: StationType.ShmetroBasic,
        visible: true,
        zIndex: 0,
        [StationType.ShmetroBasic]: { names: ['南京东路', enName], nameOffsetX: 'right', nameOffsetY: 'top' },
    });
    return graph;
};

const getSavedEnglishName = (
    graph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): string | undefined => {
    const attrs = graph.nodes.find(node => node.key === 'stn_test')?.attributes?.[
        StationType.ShmetroBasic
    ] as StationAttributes;
    return attrs.names[1];
};

const Harness = () => {
    const [attrs, setAttrs] = React.useState<StationAttributes>({ names: ['南京东路', ''] });
    const handleAttrsUpdate = (_id: string, nextAttrs: StationAttributes) => setAttrs(nextAttrs);
    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: 'Chinese',
            value: attrs.names[0],
            onChange: val => setAttrs({ ...attrs, names: [val, attrs.names[1]] }),
        },
        {
            type: 'textarea',
            label: 'English',
            value: attrs.names[1],
            onChange: val => setAttrs({ ...attrs, names: [attrs.names[0], val] }),
        },
        {
            type: 'custom',
            label: '',
            component: <StationNameTranslateButton id="stn_test" attrs={attrs} handleAttrsUpdate={handleAttrsUpdate} />,
        },
    ];

    return <RmgFields fields={fields} />;
};

describe('StationNameTranslateButton', () => {
    beforeEach(() => {
        window.graph = createGraph('Nan Jing Dong Lu');
    });

    it('focuses the English textarea and lets Ctrl+Z undo the translation via RMP history', async () => {
        const previousGraph = createGraph('');
        const presentGraph = createGraph('Nan Jing Dong Lu');
        const mockStore = createStore({
            param: {
                ...realState.param,
                present: presentGraph.export(),
                past: [previousGraph.export()],
                future: [],
            },
        });

        render(<Harness />, { store: mockStore });

        fireEvent.click(screen.getByRole('button', { name: i18n.t('panel.details.stations.common.translateName') }));

        const [, englishTextarea] = screen.getAllByRole('textbox');
        await waitFor(() => expect(englishTextarea).toHaveValue('Nan Jing Dong Lu'));
        await waitFor(() => expect(englishTextarea).toHaveFocus());

        fireEvent.keyDown(englishTextarea, { key: 'z', ctrlKey: true });

        expect(getSavedEnglishName(mockStore.getState().param.present)).toBe('');
        const [futureGraph] = mockStore.getState().param.future;
        expect(futureGraph).toBeDefined();
        expect(getSavedEnglishName(futureGraph!)).toBe('Nan Jing Dong Lu');
        const stationAttrs = window.graph.getNodeAttribute('stn_test', StationType.ShmetroBasic) as StationAttributes;
        expect(stationAttrs.names[1]).toBe('');
    });
});
