import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import AppRoot from './components/app-root';
import i18n from './i18n/config';
// eslint-disable-next-line import/no-unassigned-import
import './index.css';
import store from './redux';
import { initStore } from './redux/init';

const renderApp = () => {
    const root = createRoot(document.getElementById('root') as HTMLDivElement);
    root.render(
        <React.StrictMode>
            <Provider store={store}>
                <I18nextProvider i18n={i18n}>
                    <AppRoot />
                </I18nextProvider>
            </Provider>
        </React.StrictMode>
    );
};

// top-level await is not possible here
// also wait for the rmgRuntime to be ready for info.json
rmgRuntime.ready().then(async () => {
    await initStore(store);

    renderApp();
    rmgRuntime.injectUITools();
});
