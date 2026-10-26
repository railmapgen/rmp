const TIMELINE_PATH = '/timeline';

const stripHashQuery = (hash: string) => hash.replace(/^#/, '').split(/[?#]/, 1)[0];

export const isTimelineHash = (hash: string) => {
    const pathname = stripHashQuery(hash);
    return pathname === TIMELINE_PATH || pathname.startsWith(`${TIMELINE_PATH}/`);
};
