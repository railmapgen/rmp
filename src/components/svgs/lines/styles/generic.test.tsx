import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CityCode } from '../../../../constants/constants';
import i18n from '../../../../i18n/config';
import { createStore } from '../../../../redux';
import { initialState as accountInitialState } from '../../../../redux/account/account-slice';
import { render } from '../../../../test-utils';
import generic, { GenericAttributes } from './generic';

const GenericAttrsComponent = generic.attrsComponent;

const makeAttrs = (count: number): GenericAttributes => ({
    layers: Array.from({ length: count }, (_, index) => ({
        id: `layer_${index}`,
        color: [CityCode.Shanghai, `sh${index + 1}`, '#E4002B', MonoColour.white],
        width: 5,
        opacity: 1,
        linecap: 'butt',
        dash: 0,
        gap: 0,
    })),
});

describe('Generic attrs component', () => {
    it('keeps add and copy enabled for free users below the layer limit', () => {
        render(
            <GenericAttrsComponent id="line_test" reconcileId="" attrs={makeAttrs(1)} handleAttrsUpdate={vi.fn()} />,
            {
                store: createStore(),
            }
        );

        expect(screen.getByRole('button', { name: i18n.t('panel.details.lines.generic.addLayer') })).toBeEnabled();
        expect(screen.getByRole('button', { name: i18n.t('panel.details.lines.generic.copyLayer') })).toBeEnabled();
    });

    it('disables add and copy for free users at two layers', () => {
        render(
            <GenericAttrsComponent id="line_test" reconcileId="" attrs={makeAttrs(2)} handleAttrsUpdate={vi.fn()} />,
            {
                store: createStore(),
            }
        );

        expect(screen.getByRole('button', { name: i18n.t('panel.details.lines.generic.addLayer') })).toBeDisabled();
        screen
            .getAllByRole('button', { name: i18n.t('panel.details.lines.generic.copyLayer') })
            .forEach(button => expect(button).toBeDisabled());
    });

    it('keeps add and copy enabled for subscribers at two layers', () => {
        render(
            <GenericAttrsComponent id="line_test" reconcileId="" attrs={makeAttrs(2)} handleAttrsUpdate={vi.fn()} />,
            {
                store: createStore({
                    account: {
                        ...accountInitialState,
                        activeSubscriptions: {
                            RMP_CLOUD: true,
                            RMP_EXPORT: false,
                        },
                    },
                }),
            }
        );

        expect(screen.getByRole('button', { name: i18n.t('panel.details.lines.generic.addLayer') })).toBeEnabled();
        screen
            .getAllByRole('button', { name: i18n.t('panel.details.lines.generic.copyLayer') })
            .forEach(button => expect(button).toBeEnabled());
    });
});
