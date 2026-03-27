import { RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { ExternalStationAttributes, NameOffsetX, NameOffsetY } from '../../../constants/stations';

type ValueOf<T> = T[keyof T];

type AnyStationAttributes = ValueOf<ExternalStationAttributes>;

interface NameOffsetFieldProps<T> {
    attrs: T;
    id: string;
    nameOffsetX?: NameOffsetX;
    nameOffsetY?: NameOffsetY;
    nameOffsetCustom?: {
        offset: NameOffsetX | NameOffsetY;
        options: Record<string, string>;
        onChange: (attrs: T, val: string | number) => T;
    };
    preciseNameOffsets?: {
        x: number;
        y: number;
        anchor: 'start' | 'middle' | 'end';
    };
    handleAttrsUpdate: (id: string, attrs: T) => void;
}

const translateToAnchor = (nameOffsetX?: NameOffsetX) =>
    nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';
const translateToOffsetX = (anchor: 'start' | 'middle' | 'end'): NameOffsetX =>
    anchor === 'start' ? 'right' : anchor === 'end' ? 'left' : 'middle';

export const getNameOffsetField = <T extends AnyStationAttributes>(props: NameOffsetFieldProps<T>) => {
    const { attrs, id, nameOffsetX, nameOffsetY, nameOffsetCustom, preciseNameOffsets, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('panel.details.stations.common.preciseNameOffsets'),
            isChecked: !!preciseNameOffsets,
            onChange: val => {
                if (val) {
                    (attrs as any).preciseNameOffsets = {
                        x: 10,
                        y: -10,
                        anchor: translateToAnchor(nameOffsetX),
                    };
                    (attrs as any).nameOffsetX = 'right';
                    (attrs as any).nameOffsetY = 'top';
                } else {
                    delete (attrs as any).preciseNameOffsets;
                }
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            oneLine: true,
        },
    ];
    if (preciseNameOffsets) {
        fields.push(
            {
                type: 'input',
                label: t('panel.details.c.pos.x'),
                value: preciseNameOffsets.x.toString(),
                validator: val => !Number.isNaN(val),
                onChange: val => {
                    (attrs as any).preciseNameOffsets.x = val;
                    handleAttrsUpdate(id, attrs);
                },
            },
            {
                type: 'input',
                label: t('panel.detos.y'),
                value: preciseNameOffsets.y.toString(),
                validator: val => !Number.isNaN(val),
                onChange: val => {
                    (attrs as any).preciseNameOffsets.y = val;
                    handleAttrsUpdate(id, attrs);
                },
            },
            {
                type: 'select',
                label: t('anchor'),
                value: preciseNameOffsets.anchor,
                options: {
                    start: t('panel.details.stations.common.left'),
                    middle: t('panel.details.stations.common.middle'),
                    end: t('panel.details.stations.common.right'),
                },
                onChange: val => {
                    (attrs as any).preciseNameOffsets.anchor = val;
                    (attrs as any).nameOffsetX = translateToOffsetX(val as 'start' | 'middle' | 'end');
                    handleAttrsUpdate(id, attrs);
                },
                minW: 'full',
            }
        );
    } else {
        if (nameOffsetX) {
            fields.push({
                type: 'select',
                label: t('panel.details.stations.common.nameOffsetX'),
                value: nameOffsetX!,
                options: {
                    left: t('panel.details.stations.common.left'),
                    middle: t('panel.details.stations.common.middle'),
                    right: t('panel.details.stations.common.right'),
                },
                disabledOptions: nameOffsetY === 'middle' ? ['middle'] : [],
                onChange: val => {
                    (attrs as any).nameOffsetX = val as NameOffsetX;
                    handleAttrsUpdate(id, attrs);
                },
                minW: 'full',
            });
        }
        if (nameOffsetY) {
            fields.push({
                type: 'select',
                label: t('panel.details.stations.common.nameOffsetY'),
                value: nameOffsetY!,
                options: {
                    top: t('panel.details.stations.common.top'),
                    middle: t('panel.details.stations.common.middle'),
                    bottom: t('panel.details.stations.common.bottom'),
                },
                disabledOptions: nameOffsetX === 'middle' ? ['middle'] : [],
                onChange: val => {
                    (attrs as any).nameOffsetY = val as NameOffsetY;
                    handleAttrsUpdate(id, attrs);
                },
                minW: 'full',
            });
        }
        if (nameOffsetCustom) {
            fields.push({
                type: 'select',
                label: t('panel.details.stations.common.nameOffset'),
                value: nameOffsetCustom!.offset,
                options: nameOffsetCustom!.options,
                onChange: val => {
                    handleAttrsUpdate(id, nameOffsetCustom!.onChange(attrs, val));
                },
                minW: 'full',
            });
        }
    }

    return fields;
};
