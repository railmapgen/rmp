import { logger } from '@railmapgen/rmg-runtime';
import { Translation } from '@railmapgen/rmg-translate';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { StationCity } from '../constants/constants';
import { random_station_names_endpoint } from '../constants/server';
import { StationAttributes } from '../constants/stations';
import { RootState } from '../redux';
import { setStationNames } from '../redux/runtime/runtime-slice';

const FALLBACK_STATION_NAMES: { [key in StationCity]: { [key in keyof Translation]: string }[] } = {
    [StationCity.Shmetro]: [
        {
            'zh-Hans': '安徽南路',
            en: 'South Anhui Road',
        },
        {
            'zh-Hans': '广西西路',
            en: 'West Guangxi Road',
        },
        {
            'zh-Hans': '西藏东路',
            en: 'East Xizang Road',
        },
        {
            'zh-Hans': '湖北北路',
            en: 'North Hubei Road',
        },
        {
            'zh-Hans': '吉林中路',
            en: 'Central Jilin Road',
        },
        {
            'zh-Hans': '乌镇大道',
            en: 'Wuzhen Avenue',
        },
        {
            'zh-Hans': '龙溪公路',
            en: 'Longxi Highway',
        },
        {
            'zh-Hans': '抚顺公园',
            en: 'Fushun Park',
        },
        {
            'zh-Hans': '七星新城',
            en: 'Qixing New Town',
        },
        {
            'zh-Hans': '千灯机场',
            en: 'Qiandeng Airport',
        },
        {
            'zh-Hans': '震泽',
            en: 'Zhengze',
        },
        {
            'zh-Hans': '沧浪高科园区',
            en: 'Canglang High-Tech Park',
        },
        {
            'zh-Hans': '黎里',
            en: 'Lili',
        },
        {
            'zh-Hans': '娄塘新村',
            en: 'Loutang Xincun',
        },
        {
            'zh-Hans': '建设新村',
            en: 'Jianshe Xincun',
        },
    ],
};

const fallBackRandomStationNames = (city: StationCity) => {
    const randomStationNames = FALLBACK_STATION_NAMES[city];
    return randomStationNames.at(Math.floor(Math.random() * randomStationNames.length))!;
};

const getStationNames = createAsyncThunk<undefined, { cityName: StationCity }>(
    'runtime/getStationNames',
    async ({ cityName }, { getState, dispatch, rejectWithValue }) => {
        const { token } = (getState() as RootState).account;
        if (!token) {
            dispatch(setStationNames({ cityName, names: [] }));
            return;
        }

        const rep = await fetch(`${random_station_names_endpoint}/${cityName}`, {
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
        if (!rep.ok) {
            logger.warn('Failed to fetch random station names', rep.statusText);
            return rejectWithValue(rep.statusText);
        }
        const data = await rep.json();
        dispatch(setStationNames({ cityName, names: data }));
    }
);

export const getOneStationName = createAsyncThunk<StationAttributes['names'], StationCity>(
    'runtime/getOneStationName',
    async (cityName, { getState, dispatch }) => {
        const { stationNames } = (getState() as RootState).runtime;
        const namesFromCity = stationNames[cityName];
        if ((namesFromCity?.length ?? 0) == 0) {
            logger.debug('No random station names in cache, using fallback');
            dispatch(getStationNames({ cityName }));
            return Object.values(fallBackRandomStationNames(cityName)) as StationAttributes['names'];
        }
        // we can't modify the state directly due to the immutability of redux
        const namesFromCityCopy = structuredClone(namesFromCity!);
        const names = namesFromCityCopy.shift();
        dispatch(setStationNames({ cityName, names: namesFromCityCopy }));
        if (namesFromCityCopy!.length < 3) {
            dispatch(getStationNames({ cityName }));
        }
        return Object.values(names!) as StationAttributes['names'];
    }
);
