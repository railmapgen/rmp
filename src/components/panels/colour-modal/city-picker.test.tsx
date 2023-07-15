import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n/config';
import { render } from '../../../test-utils';
import CityPicker from './city-picker';

vi.mock('@railmapgen/rmg-palette-resources', () => ({
    __esModule: true,
    cityList: [
        {
            id: 'edinburgh',
            country: 'GBSCT',
            name: {
                en: 'Edinburgh',
                'zh-Hans': '爱丁堡',
                'zh-Hant': '愛丁堡',
            },
        },
        {
            id: 'hongkong',
            country: 'HK',
            name: {
                en: 'Hong Kong',
                zh: '香港',
            },
        },
        {
            id: 'taipei',
            country: 'TW',
            name: {
                en: 'Taipei',
                zh: '台北',
            },
        },
    ],

    countryList: [
        {
            id: 'GBSCT',
            name: {
                en: 'Scotland',
            },
            flagEmoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
            flagSvg: '1F3F4-E0067-E0062-E0073-E0063-E0074-E007F.svg',
        },
        {
            id: 'HK',
            name: {
                en: 'Hong Kong',
                zh: '香港',
            },
            flagEmoji: '🇭🇰',
            flagSvg: '1F1ED-1F1F0.svg',
        },
        {
            id: 'TW',
            name: {
                en: 'Taiwan',
            },
            flagEmoji: '🇹🇼',
            flagSvg: '1F1F9-1F1FC.svg',
        },
    ],

    CityCode: {
        Other: 'other',
    },

    MonoColour: {
        black: '#000',
        white: '#fff',
    },
}));

const mockCallbacks = {
    onChange: vi.fn(),
};

describe('Unit tests for CityPicker component', () => {
    beforeEach(() => {
        i18n.changeLanguage('zh-Hans');
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.resetAllMocks();
    });

    it('Can render flag emojis (for non-Windows users) and translations as expected', async () => {
        render(<CityPicker />);

        fireEvent.focus(screen.getByRole('combobox'));
        await screen.findByRole('dialog');

        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems).toHaveLength(3);

        expect(menuItems[0]).toHaveTextContent('🏴󠁧󠁢󠁳󠁣󠁴󠁿'); // GBSCT
        expect(menuItems[1]).toHaveTextContent('🏴'); // TW to be censored
        expect(menuItems[2]).toHaveTextContent('🇭🇰'); // HK

        // sorted by Pinyin (under zh-Hans locale)
        expect(menuItems[0]).toHaveTextContent('爱丁堡'); // read zh-Hans field
        expect(menuItems[1]).toHaveTextContent('台北'); // read zh field
        expect(menuItems[2]).toHaveTextContent('香港'); // read zh field
    });

    it('Can render OpenMoji SVG-format emoji for Windows users as expected', async () => {
        const platformGetter = vi.spyOn(window.navigator, 'platform', 'get');
        platformGetter.mockReturnValue('Win64');

        render(<CityPicker />);

        fireEvent.focus(screen.getByRole('combobox'));
        await screen.findByRole('dialog');

        // flag svg to be displayed for 2 of the cities
        await screen.findByAltText('Flag of GBSCT');
        await screen.findByAltText('Flag of HK');

        // TW to be censored
        expect(screen.getAllByRole('menuitem')[1]).toHaveTextContent('🏴');
    });

    it('Can mount component with default city code as expected', () => {
        render(<CityPicker defaultValueId={'hongkong' as any} />);

        expect(screen.getByDisplayValue('香港')).toBeInTheDocument();
    });

    it('Can handle city selection as expected', async () => {
        render(<CityPicker {...mockCallbacks} />);

        fireEvent.focus(screen.getByRole('combobox'));
        await screen.findByRole('dialog');

        fireEvent.click(screen.getByRole('menuitem', { name: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 爱丁堡' }));

        expect(mockCallbacks.onChange).toBeCalledTimes(1);
        expect(mockCallbacks.onChange).toBeCalledWith('edinburgh');

        expect(screen.getByDisplayValue('爱丁堡')).toBeInTheDocument();
    });

    // TODO: isSettled
});
