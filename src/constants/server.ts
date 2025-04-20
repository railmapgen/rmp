import rmgRuntime from '@railmapgen/rmg-runtime';

export const subscription_endpoint = 'https://railmapgen.org/v1/subscription';
export const random_station_names_endpoint = 'https://railmapgen.org/v1/randomStationNames';

export const isTauri = rmgRuntime.getInstance() === 'Tauri' && '__TAURI__' in window.parent;

// set fetch to tauri fetch if in tauri
export const fetch = isTauri
    ? async (url: RequestInfo | URL, init?: RequestInit) => {
          const headers = init?.headers || {};
          // @ts-expect-error global TAURI is injected in rmg-home
          return window.parent.__TAURI__.http.fetch(url, {
              ...init,
              headers: {
                  ...headers,
                  referer: 'https://railmapgen.org/',
              },
          }) as ReturnType<typeof window.fetch>;
      }
    : window.fetch;
