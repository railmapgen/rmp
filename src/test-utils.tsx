import { Store } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, RenderOptions } from '@testing-library/react';
import React, { ReactElement, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import i18n from './i18n/config';
import rootReducer from './redux';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    store: Store;
}

const initialOptions: CustomRenderOptions = {
    store: configureStore()({ ...rootReducer.getState() }),
};

interface TestingProviderProps {
    children?: ReactNode;
    store: Store;
}

export const TestingProvider = (props: TestingProviderProps) => {
    const { children, store } = props;

    return (
        <I18nextProvider i18n={i18n}>
            <Provider store={store}>{children}</Provider>
        </I18nextProvider>
    );
};

const customRender = (ui: ReactElement, { store, ...renderOptions } = initialOptions) => {
    return render(ui, {
        wrapper: props => <TestingProvider store={store} {...props} />,
        ...renderOptions,
    });
};

export { customRender as render };
