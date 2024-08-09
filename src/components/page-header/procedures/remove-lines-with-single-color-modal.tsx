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
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { openPaletteAppClip, refreshEdgesThunk } from '../../../redux/runtime/runtime-slice';
import { AttributesWithColor } from '../../panels/details/color-field';
import ThemeButton from '../../panels/theme-button';

export const RemoveLinesWithSingleColorModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const {
        theme: runtimeTheme,
        paletteAppClip: { output },
    } = useRootSelector(state => state.runtime);
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);

    const [theme, setTheme] = React.useState(runtimeTheme);

    const [isThemeRequested, setIsThemeRequested] = React.useState(false);
    React.useEffect(() => {
        if (isThemeRequested && output) {
            setTheme(output);
            setIsThemeRequested(false);
        }
    }, [output?.toString()]);

    const handleChange = () => {
        graph.current
            .filterEdges(
                (edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
                    LineStylesWithColor.includes(attr.style) &&
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
                    <ThemeButton
                        theme={theme}
                        onClick={() => {
                            setIsThemeRequested(true);
                            dispatch(openPaletteAppClip(theme));
                        }}
                    />
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
