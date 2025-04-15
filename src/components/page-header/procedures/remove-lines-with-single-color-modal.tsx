import {
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LineStylesWithColor } from '../../../constants/lines';
import { useRootDispatch } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk } from '../../../redux/runtime/runtime-slice';
import { usePaletteTheme } from '../../../util/hooks';
import { AttributesWithColor } from '../../panels/details/color-field';
import ThemeButton from '../../panels/theme-button';

export const RemoveLinesWithSingleColorModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);

    const { theme, requestThemeChange } = usePaletteTheme();

    const handleChange = () => {
        graph.current
            .filterEdges(
                (edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
                    LineStylesWithColor.has(attr.style) &&
                    JSON.stringify((attr[attr.style] as AttributesWithColor)!.color) === JSON.stringify(theme)
            )
            .forEach(edge => graph.current.dropEdge(edge));
        dispatch(refreshEdgesThunk());
        dispatch(saveGraph(graph.current.export()));
        onClose();
    };

    /** FIXME: We shouldn't remove the focus trap as this breaks the accessibility.
     *         However this seems to be the only workaround to prevent the focus
     *         of Palette App Clip being stolen by this modal.
     *         Instead of fixing the focus trap, we should avoid rendering modal/portal
     *         one on top of another, as it's a bad UX design. :(
     */
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside" trapFocus={false}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.procedures.removeLines.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    {t('header.settings.procedures.removeLines.content')}
                    <ThemeButton theme={theme} onClick={requestThemeChange} />
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button colorScheme="red" onClick={handleChange}>
                        {t('remove')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
