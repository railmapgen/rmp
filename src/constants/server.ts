export const subscription_endpoint = 'https://railmapgen.org/v1/subscription';
export const random_station_names_endpoint = 'https://railmapgen.org/v1/randomStationNames';

// rmgRuntime.getInstance() === 'Tauri' requires an async rmgRuntime.ready().
export const isTauri = '__TAURI__' in window.parent;
