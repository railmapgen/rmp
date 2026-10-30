import { Box, BoxProps, Flex, Icon, useColorModeValue } from '@chakra-ui/react';
import { MdLock } from 'react-icons/md';
import type { ActiveSubscriptions } from '../../redux/account/account-slice';
import SubscriptionBadge from '../subscription-badge';

type TimelineLockedGlassProps = BoxProps & { label?: string; subscription?: keyof ActiveSubscriptions };

/** Visual feedback only: readonly handlers enforce the lock while seeking stays available. */
export default function TimelineLockedGlass({ label, subscription, ...props }: TimelineLockedGlassProps) {
    const background = useColorModeValue('rgba(240, 244, 250, 0.38)', 'rgba(22, 28, 40, 0.38)');
    const foreground = useColorModeValue('gray.600', 'gray.200');
    return (
        <Flex
            position="absolute"
            inset={0}
            zIndex={3}
            align="center"
            justify="center"
            gap={2}
            bg={background}
            backdropFilter="blur(3px)"
            pointerEvents="none"
            borderRadius="inherit"
            aria-label={label}
            data-timeline-locked-glass
            {...props}
        >
            <Box bg={background} color={foreground} borderRadius="full" p={2} boxShadow="sm">
                <Icon as={MdLock} boxSize={5} display="block" />
            </Box>
            {subscription && <SubscriptionBadge subscription={subscription} pointerEvents="auto" />}
        </Flex>
    );
}
