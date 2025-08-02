// const server = 'https://railmapgen.org';
const server = 'http://localhost:3000';

export const subscription_endpoint = `${server}/v1/subscription`;
export const random_station_names_endpoint = `${server}/v1/randomStationNames`;
export const shared_work_endpoint = `${server}/v1/share`;
export const image_endpoint = `${server}/v1/image`;

// rmgRuntime.getInstance() === 'Tauri' requires an async rmgRuntime.ready().
export const isTauri = '__TAURI__' in window.parent;
