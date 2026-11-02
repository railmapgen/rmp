import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { Provider } from 'react-redux';
import { AttrsProps, LocalStorageKey } from '../../constants/constants';
import { StationAttributes, StationType } from '../../constants/stations';
import { createStore, useRootDispatch, useRootSelector } from '../../redux';
import { normalizeStationNameTranslationMode } from '../../redux/state-migration';
import { closePaletteAppClip, onPaletteAppClipEmit } from '../../redux/runtime/runtime-slice';
import { useTimelineSelector } from '../../timeline/timeline-store';
import { ColorFieldContext } from '../panels/details/color-field';
import { StationAttrsContext } from '../panels/details/station-attrs-context';
import stations from '../svgs/stations/stations';

const RmgPaletteAppClip = React.lazy(() => import('../panels/rmg-palette-app-clip'));

function StationPalette() {
    const dispatch = useRootDispatch();
    const input = useRootSelector(state => state.runtime.paletteAppClip.input);
    return input ? (
        <React.Suspense fallback={null}>
            <RmgPaletteAppClip
                isOpen
                defaultTheme={input}
                onClose={() => dispatch(closePaletteAppClip())}
                onSelect={theme => dispatch(onPaletteAppClipEmit(theme))}
            />
        </React.Suspense>
    ) : null;
}

interface TimelineStationAttrsProps {
    id: string;
    type: StationType;
    attrs: StationAttributes;
    mapEnabled: boolean;
    onChange: (attrs: StationAttributes, original: StationAttributes) => void;
    onUndo: () => void;
}

/** A local compatibility boundary for RMP fields; drawing actions never reach the Timeline store. */
export default function TimelineStationAttrs({
    id,
    type,
    attrs,
    mapEnabled,
    onChange,
    onUndo,
}: TimelineStationAttrsProps) {
    const account = useTimelineSelector(state => state.account);
    const store = React.useMemo(() => {
        const initial = createStore().getState();
        let translationMode = initial.app.preference.stationNameTranslationMode;
        try {
            const saved = JSON.parse(rmgRuntime.storage.get(LocalStorageKey.APP) ?? '{}');
            translationMode = normalizeStationNameTranslationMode(saved.preference?.stationNameTranslationMode);
        } catch {
            // Preferences may be unavailable in an embedded or newly initialized workspace.
        }
        return createStore({
            account,
            app: {
                ...initial.app,
                preference: { ...initial.app.preference, stationNameTranslationMode: translationMode },
            },
            param: { ...initial.param, present: { ...initial.param.present, mapEnabled } },
        });
    }, [account, mapEnabled]);
    // Several established RMP components mutate their input before submitting it.
    const originalAttrs = structuredClone(attrs);
    const editableAttrs = structuredClone(originalAttrs);
    const submit = (next: StationAttributes) => onChange(structuredClone(next), originalAttrs);
    const AttrsComponent = stations[type].attrsComponent as unknown as React.FC<AttrsProps<StationAttributes>>;
    return (
        <Provider store={store}>
            <StationAttrsContext.Provider value={{ type, attrs: editableAttrs, onChange: submit, onUndo }}>
                <ColorFieldContext.Provider
                    value={{ type, attrs: editableAttrs, handleAttrsUpdate: next => submit(next as StationAttributes) }}
                >
                    <AttrsComponent
                        key={`${id}:${type}`}
                        id={id}
                        attrs={editableAttrs}
                        handleAttrsUpdate={(_, next) => submit(next)}
                    />
                </ColorFieldContext.Provider>
                <StationPalette />
            </StationAttrsContext.Provider>
        </Provider>
    );
}
