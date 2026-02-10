import { Alert, AlertIcon, Flex, Link, Text } from '@chakra-ui/react';
import { RmgErrorBoundary, RmgThemeProvider, RmgWindow } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LocalStorageKey } from '../constants/constants';
import { useRootDispatch, useRootSelector } from '../redux';
import { setActiveSubscriptions } from '../redux/account/account-slice';
import { closePaletteAppClip, onPaletteAppClipEmit, setGlobalAlert } from '../redux/runtime/runtime-slice';
import { checkCNY2026Period, CNY_CHECK_INTERVAL } from '../util/cny-2026';

const PageHeader = React.lazy(() => import('./page-header/page-header'));
const ToolsPanel = React.lazy(() => import('./panels/tools/tools'));
const SvgWrapper = React.lazy(() => import('./svg-wrapper'));
const DetailsPanel = React.lazy(() => import('./panels/details/details'));
const RmgPaletteAppClip = React.lazy(() => import('./panels/rmg-palette-app-clip'));

export default function AppRoot() {
    const dispatch = useRootDispatch();
    const {
        paletteAppClip: { input },
    } = useRootSelector(state => state.runtime);
    const accountState = useRootSelector(state => state.account.state);
    const activeSubscriptions = useRootSelector(state => state.account.activeSubscriptions);
    const {
        t,
        i18n: { language: lang },
    } = useTranslation();

    const [isShowRMTMessage, setIsShowRMTMessage] = React.useState(false);

    React.useEffect(() => {
        if (rmgRuntime.isStandaloneWindow() && !window.localStorage.getItem(LocalStorageKey.DO_NOT_SHOW_RMT_MSG)) {
            setIsShowRMTMessage(true);
        }
    }, []);

    // CNY 2026 promotion: Check if we're in the promotional period and unlock RMP_CLOUD
    const [cnyNotificationShown, setCnyNotificationShown] = React.useState(false);

    // Show CNY notification once per session (always, regardless of login or period)
    React.useEffect(() => {
        if (!cnyNotificationShown) {
            const timeoutId = setTimeout(() => {
                dispatch(
                    setGlobalAlert({
                        status: 'warning',
                        message: t('happyChineseNewYear'),
                        url: `https://railmapgen.org/rmt-blog/${lang}/rmg-7th-newyear`,
                    })
                );
                setCnyNotificationShown(true);
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [cnyNotificationShown, dispatch, t]);

    // Check CNY period and enable RMP_CLOUD for logged-in users
    React.useEffect(() => {
        let isActive = true;

        const checkAndApplyCNYPromotion = async () => {
            // Check login status inside to handle users logging in during use
            const isLoggedIn = accountState === 'free' || accountState === 'subscriber';
            if (!isLoggedIn || !isActive) return;

            const isInPeriod = await checkCNY2026Period();
            if (isInPeriod && isActive) {
                // Enable RMP_CLOUD for all logged-in users during CNY period
                if (!activeSubscriptions.RMP_CLOUD) {
                    dispatch(
                        setActiveSubscriptions({
                            ...activeSubscriptions,
                            RMP_CLOUD: true,
                        })
                    );
                }
            }
        };

        // Check immediately on mount
        checkAndApplyCNYPromotion();

        // Check every 15 minutes
        const intervalId = setInterval(checkAndApplyCNYPromotion, CNY_CHECK_INTERVAL);

        return () => {
            isActive = false;
            clearInterval(intervalId);
        };
    }, [accountState, activeSubscriptions, dispatch]);

    return (
        <RmgThemeProvider>
            <RmgWindow>
                <React.Suspense
                    fallback={
                        <p
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            Rail Map Painter protocol... checked
                        </p>
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

                    <RmgPaletteAppClip
                        isOpen={!!input}
                        onClose={() => dispatch(closePaletteAppClip())}
                        defaultTheme={input}
                        onSelect={nextTheme => dispatch(onPaletteAppClipEmit(nextTheme))}
                    />
                </React.Suspense>
            </RmgWindow>
        </RmgThemeProvider>
    );
}
