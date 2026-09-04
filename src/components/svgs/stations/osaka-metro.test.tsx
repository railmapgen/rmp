import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StationType } from '../../../constants/stations';
import { render as renderWithProviders } from '../../../test-utils';
import { Node2Font, TextLanguage } from '../../../util/fonts';
import stations from './stations';

const osakaMetroStation = stations[StationType.OsakaMetro];
const Station = osakaMetroStation.component;
const ROBOTO_FONT_FAMILY = 'Roboto, Arial, Helvetica, sans-serif';

const renderStation = (stationType: 'normal' | 'through', lineCode: string) => {
    const attrs = structuredClone(osakaMetroStation.defaultAttrs);
    attrs.stationType = stationType;
    attrs.transfer[0][0][4] = lineCode;

    return renderWithProviders(
        <svg>
            <Station
                id="stn_test"
                x={0}
                y={0}
                attrs={{ [StationType.OsakaMetro]: attrs }}
                handlePointerDown={vi.fn()}
                handlePointerMove={vi.fn()}
                handlePointerUp={vi.fn()}
            />
        </svg>
    );
};

describe('OsakaMetroStation', () => {
    it.each([
        ['normal', 'M', ['M16']],
        ['through', 'M', ['M16']],
        ['through', 'MM', ['MM', '16']],
    ] as const)('uses Roboto for %s station codes', (stationType, lineCode, expectedTexts) => {
        const { container } = renderStation(stationType, lineCode);

        for (const expectedText of expectedTexts) {
            const text = Array.from(container.querySelectorAll('text')).find(node => node.textContent === expectedText);
            expect(text).toHaveAttribute('font-family', ROBOTO_FONT_FAMILY);
        }
    });

    it('uses Roboto for the station picker icon', () => {
        const { container } = render(<svg>{osakaMetroStation.icon}</svg>);

        expect(container.querySelector('text')).toHaveAttribute('font-family', ROBOTO_FONT_FAMILY);
    });

    it('loads the station name and station code fonts', () => {
        expect(Node2Font[StationType.OsakaMetro]).toEqual([TextLanguage.tokyo_ja, TextLanguage.berlin]);
    });
});
