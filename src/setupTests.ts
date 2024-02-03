import infoJson from '../info.json';

const originalFetch = global.fetch;
global.fetch = (...args) => {
    if (args[0].toString().includes('/info.json')) {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(infoJson),
        }) as any;
    } else {
        return originalFetch(...args);
    }
};
