import { Alert, AlertIcon, Flex, Link, Text } from '@chakra-ui/react';
import { RmgErrorBoundary, RmgThemeProvider, RmgWindow } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LocalStorageKey } from '../constants/constants';

const PageHeader = React.lazy(() => import('./page-header/page-header'));
const ToolsPanel = React.lazy(() => import('./panels/tools/tools'));
const SvgWrapper = React.lazy(() => import('./svg-wrapper'));
const DetailsPanel = React.lazy(() => import('./panels/details/details'));

export default function AppRoot() {
    const { t } = useTranslation();

    const [isShowRMTMessage, setIsShowRMTMessage] = React.useState(false);

    React.useEffect(() => {
        if (rmgRuntime.isStandaloneWindow() && !window.localStorage.getItem(LocalStorageKey.DO_NOT_SHOW_RMT_MSG)) {
            setIsShowRMTMessage(true);
        }
    }, []);

    const d = new Date();
    const tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}01`;
    const ver = `${String(d.getFullYear()).slice(-2)}.${d.getMonth() + 1}.1`;

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
                                <a
                                    href="https://github.com/railmapgen/railmapgen.github.io/releases"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    offline application
                                </a>{' '}
                                .
                                <br />
                                <br />
                                Offline applications via ghproxy.com{' '}
                                <a
                                    href={`https://ghproxy.com/https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri-${tag}/railmapgen_${ver}_x64-setup.exe`}
                                >
                                    Windows
                                </a>{' '}
                                <a
                                    href={`https://ghproxy.com/https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri-${tag}/railmapgen_${ver}_x64.dmg`}
                                >
                                    MacOS
                                </a>{' '}
                                <a
                                    href={`https://ghproxy.com/https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri-${tag}/railmapgen_${ver}_amd64.deb`}
                                >
                                    Linux
                                </a>{' '}
                                if you are in mainland China :)
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
