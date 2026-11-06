import { Box, Flex } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

/** Keep stateful header controls in one horizontally scrollable row. */
export default function ResponsiveHeaderActions({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
    const actionsRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const actions = actionsRef.current;
        if (!actions) return;
        const scrollActions = (event: WheelEvent) => {
            if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
            const target = event.target;
            if (target instanceof Element && target.closest('[role="menu"], [role="dialog"]')) return;
            const maxScroll = actions.scrollWidth - actions.clientWidth;
            if (maxScroll <= 0) return;
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            const unit = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? actions.clientWidth : 1;
            const nextScroll = Math.max(0, Math.min(maxScroll, actions.scrollLeft + delta * unit));
            if (nextScroll === actions.scrollLeft) return;
            event.preventDefault();
            actions.scrollLeft = nextScroll;
        };
        actions.addEventListener('wheel', scrollActions, { passive: false });
        return () => actions.removeEventListener('wheel', scrollActions);
    }, []);

    return (
        <Box
            data-testid="responsive-header-actions"
            flex="1 0 128px"
            minW="32px"
            position="relative"
            overflow="visible"
        >
            <Flex
                ref={actionsRef}
                role="toolbar"
                aria-label={t('Menu')}
                aria-orientation="horizontal"
                tabIndex={0}
                // Menus use the outer slot as their containing block, outside this clipping scroller.
                position="static"
                width="100%"
                overflowX="auto"
                overflowY="visible"
                flexWrap="nowrap"
                align="center"
                gap={2}
                sx={{
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                    '& > :first-child': { marginInlineStart: 'auto' },
                    '& > button, & > a': { flexShrink: 0 },
                }}
            >
                {children}
            </Flex>
        </Box>
    );
}
