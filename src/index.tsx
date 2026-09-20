import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import i18n from './i18n/config';
// eslint-disable-next-line import/no-unassigned-import
import './index.css';

const isTimelinePath = () => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const pathname = window.location.pathname;
    const relative = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
    return relative === '/timeline' || relative.startsWith('/timeline/');
};

const renderTimelineApp = async () => {
    const [{ default: TimelineAppRoot }, { initTimelineStore, timelineStore }] = await Promise.all([
        import('./components/timeline-app-root'),
        import('./timeline/timeline-store'),
    ]);
    await initTimelineStore();
    const root = createRoot(document.getElementById('root') as HTMLDivElement);
    root.render(
        <React.StrictMode>
            <Provider store={timelineStore}>
                <I18nextProvider i18n={i18n}>
                    <TimelineAppRoot />
                </I18nextProvider>
            </Provider>
        </React.StrictMode>
    );
};

const renderRmpApp = async () => {
    const [{ default: AppRoot }, { default: store }, { initStore }] = await Promise.all([
        import('./components/app-root'),
        import('./redux/store'),
        import('./redux/init'),
    ]);
    await initStore(store);
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
    if (isTimelinePath()) await renderTimelineApp();
    else await renderRmpApp();
    rmgRuntime.injectUITools();
});
