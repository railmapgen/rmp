import {
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    useToast,
} from '@chakra-ui/react';
import { MonoColour, updateTheme } from '@railmapgen/rmg-palette-resources';
import { logger } from '@railmapgen/rmg-runtime';
import { SerializedGraph } from 'graphology-types';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../../../constants/constants';
import { useRootDispatch } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from '../../../redux/runtime/runtime-slice';

export const UpdateColorModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const toast = useToast();
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);

    const [updating, setUpdating] = React.useState(false);

    const handleChange = async () => {
        setUpdating(true);
        const param = JSON.stringify(graph.current.export());
        try {
            const updatedParam = await updateColors(param);
            graph.current.clear();
            graph.current.import(updatedParam);
            dispatch(saveGraph(graph.current.export()));
            dispatch(refreshNodesThunk());
            dispatch(refreshEdgesThunk());
            toast({
                title: t('header.settings.procedures.updateColor.success'),
                status: 'success' as const,
                duration: 9000,
                isClosable: true,
            });
        } catch (e) {
            logger.error(`[rmp] Error in updating all colors: ${e}`);
            toast({
                title: t('header.settings.procedures.updateColor.error', { e }),
                status: 'error' as const,
                duration: 9000,
                isClosable: true,
            });
        }
        setUpdating(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.procedures.updateColor.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <Text>{t('header.settings.procedures.updateColor.content')}</Text>
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button colorScheme="red" onClick={handleChange} isLoading={updating}>
                        {t('apply')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

interface MatchedThemeWithPaths {
    path: string;
    value: Theme;
}

const isTheme = (arr: any[]): boolean => {
    return (
        arr.length >= 4 && // InterchangeInfo will append strings after Theme
        arr.every(elem => typeof elem === 'string') && // type ok
        !!arr[2].match(/^#[0-9a-fA-F]{6}$/) && // hex ok
        Object.values(MonoColour).includes(arr[3] as any) // bg ok
    );
};

const getMatchedThemesWithPaths = (obj: any): MatchedThemeWithPaths[] => {
    const results: MatchedThemeWithPaths[] = [];

    const search = (o: any, currentPath?: string) => {
        if (Array.isArray(o) && isTheme(o)) {
            // push itself if it's theme
            results.push({ path: currentPath || '', value: o as Theme });
            return;
        }

        for (const key in o) {
            const value = o[key];
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            if (Array.isArray(value)) {
                if (isTheme(value)) {
                    results.push({ path: newPath, value: value as Theme });
                } else {
                    value.forEach((it, idx) => search(it, `${newPath}.${idx}`));
                }
            } else if (value && typeof value === 'object') {
                search(value, newPath);
            }
        }
    };

    search(obj);

    return results;
};

const dottieSet = (obj: any, path: string, value: any): void => {
    const pathParts = path.split('.');
    let currentObj: any = obj;
    for (let i = 0; i < pathParts.length - 1; i++) {
        currentObj = currentObj[pathParts[i]];
    }
    currentObj[pathParts[pathParts.length - 1]] = value;
};

const updateColors = async (s: string): Promise<SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>> => {
    const param = JSON.parse(s) as SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    const startTimestamp = new Date().getTime();

    const matchedThemes = getMatchedThemesWithPaths(param);
    logger.debug(`[rmp] Found all themes pending for update`, matchedThemes);

    const TIMEOUT = 10000;
    let timeoutId;
    let aborted = false;
    const updatePromise = new Promise<void>((resolve, reject) => {
        timeoutId = setTimeout(() => {
            aborted = true;
            reject(`Executing time exceeds ${TIMEOUT}ms`);
        }, TIMEOUT);

        (async () => {
            for (const { path, value } of matchedThemes) {
                if (aborted) {
                    throw new Error('Update aborted');
                }

                // InterchangeInfo will append strings after Theme
                const [cityID, lineID, color, bg, ...rest] = value;

                // do not use Promise.all to void firing hundreds of same requests
                const updatedTheme = await updateTheme([cityID, lineID, color, bg], undefined, true);
                dottieSet(param, path, [...updatedTheme, ...rest]);
            }
        })()
            .then(resolve)
            .catch(reject);
    });

    try {
        await updatePromise;
        logger.debug(
            `[rmp] Themes update completed, elapsed time ${(new Date().getTime() - startTimestamp) / 1000} sec`
        );
        return param;
    } finally {
        clearTimeout(timeoutId);
    }
};
