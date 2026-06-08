import { Button } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../constants/constants';
import { StationAttributes } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { undoAction } from '../../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from '../../../redux/runtime/runtime-slice';
import { isMacClient } from '../../../util/helpers';
import { translateStationNameByPinyin, translateStationNameBySemantic } from '../../../util/station-name-translation';
import { sendErrorNotification } from '../../../util/notifications';

const StationNameTranslateButton = <T extends StationAttributes>(props: AttrsProps<T>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { token, activeSubscriptions } = useRootSelector(state => state.account);
    const {
        preference: { stationNameTranslationMode },
    } = useRootSelector(state => state.app);
    const [isLoading, setIsLoading] = React.useState(false);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const lastTranslatedTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const lastTranslatedValueRef = React.useRef<string | undefined>(undefined);

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const textarea = lastTranslatedTextareaRef.current;
            const lastTranslatedValue = lastTranslatedValueRef.current;
            const isUndoKey =
                event.key.toLowerCase() === 'z' &&
                (isMacClient ? event.metaKey && !event.shiftKey : event.ctrlKey && !event.shiftKey);

            if (!isUndoKey || !textarea || !lastTranslatedValue || document.activeElement !== textarea) {
                return;
            }

            if (textarea.value !== lastTranslatedValue) {
                lastTranslatedTextareaRef.current = null;
                lastTranslatedValueRef.current = undefined;
                return;
            }

            event.preventDefault();
            dispatch(undoAction());
            dispatch(refreshNodesThunk());
            dispatch(refreshEdgesThunk());
            lastTranslatedTextareaRef.current = null;
            lastTranslatedValueRef.current = undefined;
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [dispatch]);

    const focusEnglishNameTextarea = React.useCallback((translatedValue: string) => {
        window.setTimeout(() => {
            const customField = buttonRef.current?.closest('[aria-label]');
            const textarea = customField?.previousElementSibling?.querySelector('textarea');
            if (textarea instanceof HTMLTextAreaElement) {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                lastTranslatedTextareaRef.current = textarea;
                lastTranslatedValueRef.current = translatedValue;
            }
        });
    }, []);

    const handleClick = React.useCallback(async () => {
        const zhName = attrs.names[0]?.trim();
        if (!zhName) {
            sendErrorNotification(
                t('panel.details.stations.common.translateName'),
                t('panel.details.stations.common.translateNameEmpty')
            );
            return;
        }

        if (stationNameTranslationMode === 'semantic' && (!token || !activeSubscriptions.RMP_CLOUD)) {
            sendErrorNotification(
                t('panel.details.stations.common.translateName'),
                t('panel.details.stations.common.translateNameNotSubscribed')
            );
            return;
        }

        try {
            setIsLoading(true);
            const en =
                stationNameTranslationMode === 'semantic'
                    ? await translateStationNameBySemantic(zhName, token!)
                    : translateStationNameByPinyin(zhName, stationNameTranslationMode);
            const nextAttrs = structuredClone(attrs);
            nextAttrs.names[1] = en;
            handleAttrsUpdate(id, nextAttrs);
            focusEnglishNameTextarea(en);
        } catch {
            sendErrorNotification(
                t('panel.details.stations.common.translateName'),
                t('panel.details.stations.common.translateNameFailed')
            );
        } finally {
            setIsLoading(false);
        }
    }, [
        activeSubscriptions.RMP_CLOUD,
        attrs,
        focusEnglishNameTextarea,
        handleAttrsUpdate,
        id,
        stationNameTranslationMode,
        t,
        token,
    ]);

    return (
        <Button ref={buttonRef} size="sm" width="100%" isLoading={isLoading} onClick={handleClick}>
            {t('panel.details.stations.common.translateName')}
        </Button>
    );
};

export default StationNameTranslateButton;
