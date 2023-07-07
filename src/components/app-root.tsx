import {
    Alert,
    AlertIcon,
    CloseButton,
    Flex,
    Image,
    Link,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Text,
} from '@chakra-ui/react';
import { RmgErrorBoundary, RmgThemeProvider, RmgWindow } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LocalStorageKey } from '../constants/constants';
import { useRootDispatch, useRootSelector } from '../redux';
import { setOpenGuidaoTransitQECode } from '../redux/runtime/runtime-slice';

const PageHeader = React.lazy(() => import('./page-header/page-header'));
const ToolsPanel = React.lazy(() => import('./panels/tools/tools'));
const SvgWrapper = React.lazy(() => import('./svg-wrapper'));
const DetailsPanel = React.lazy(() => import('./panels/details/details'));

export default function AppRoot() {
    const dispatch = useRootDispatch();
    const { t } = useTranslation();

    const { guidaoTransitQECode } = useRootSelector(state => state.runtime);

    const [isShowRMTMessage, setIsShowRMTMessage] = React.useState(false);
    const [isGuidaoTransitMessage, setIsGuidaoTransitMessage] = React.useState(true);

    React.useEffect(() => {
        if (rmgRuntime.isStandaloneWindow() && !window.localStorage.getItem(LocalStorageKey.DO_NOT_SHOW_RMT_MSG)) {
            setIsShowRMTMessage(true);
        }
    }, []);

    return (
        <RmgThemeProvider>
            <RmgWindow>
                <React.Suspense
                    fallback={
                        <>
                            <p
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                }}
                            >
                                Rail Map Toolkit protocol... checked
                            </p>
                            <p
                                style={{
                                    position: 'absolute',
                                    top: '75%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    fontSize: 'small',
                                    color: 'gray',
                                }}
                            >
                                Seeing this page for too long? Try another mirror{' '}
                                <a href="https://railmapgen.github.io/?app=rmp" target="_blank" rel="noreferrer">
                                    GitHub
                                </a>{' '}
                                <a href="https://railmapgen.gitlab.io/?app=rmp" target="_blank" rel="noreferrer">
                                    Gitlab
                                </a>{' '}
                                or the{' '}
                                <a href="https://github.com/railmapgen/rmp/releases" target="_blank" rel="noreferrer">
                                    offline application
                                </a>{' '}
                                :)
                            </p>
                        </>
                    }
                >
                    <PageHeader />

                    {isShowRMTMessage && (
                        <Alert status="info" variant="solid" size="xs" pl={3} pr={1} py={1} zIndex="1">
                            <AlertIcon />
                            <Text>
                                <Link href="/?app=rmp" isExternal fontWeight="bold">
                                    {t('rmtPromotion')}
                                </Link>{' '}
                                <Link
                                    as="button"
                                    ml="auto"
                                    textDecoration="underline"
                                    onClick={() => setIsShowRMTMessage(false)}
                                >
                                    {t('close')}
                                </Link>
                                {' | '}
                                <Link
                                    as="button"
                                    textDecoration="underline"
                                    onClick={() => {
                                        setIsShowRMTMessage(false);
                                        window.localStorage.setItem(LocalStorageKey.DO_NOT_SHOW_RMT_MSG, 'true');
                                    }}
                                >
                                    {t('noShowAgain')}
                                </Link>
                            </Text>
                        </Alert>
                    )}

                    {isGuidaoTransitMessage && (
                        <Alert status="info" variant="solid" size="xs" pl={3} pr={1} py={1} zIndex="1">
                            <AlertIcon />
                            <Text>
                                <Link onClick={() => dispatch(setOpenGuidaoTransitQECode(true))}>
                                    {t('header.about.guidaoTransitContent')}
                                </Link>
                            </Text>
                            <CloseButton ml="auto" onClick={() => setIsGuidaoTransitMessage(false)} />
                        </Alert>
                    )}

                    <Modal
                        size="6xl"
                        isOpen={guidaoTransitQECode}
                        onClose={() => dispatch(setOpenGuidaoTransitQECode(false))}
                    >
                        <ModalOverlay />
                        <ModalContent>
                            <ModalHeader>{t('header.about.guidaoTransit')}</ModalHeader>
                            <ModalCloseButton />

                            <ModalBody paddingBottom={10}>
                                <Image
                                    width="1080"
                                    height="203"
                                    src={import.meta.env.BASE_URL + '/images/guidaoTransitQRCode.png'}
                                />
                            </ModalBody>
                        </ModalContent>
                    </Modal>

                    <RmgErrorBoundary allowReset>
                        <Flex direction="row" height="100%" overflow="hidden" sx={{ position: 'relative' }}>
                            {/* `position: 'relative'` is used to make sure RmgSidePanel in DetailsPanel
                            have the right parent container for its `position: 'absolute'` calculation. */}
                            <ToolsPanel />
                            <SvgWrapper />
                            <DetailsPanel />
                        </Flex>
                    </RmgErrorBoundary>
                </React.Suspense>
            </RmgWindow>
        </RmgThemeProvider>
    );
}
