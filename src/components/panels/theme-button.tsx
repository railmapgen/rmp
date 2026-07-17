import { IconButton } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { MdCircle } from 'react-icons/md';
import { Theme } from '../../constants/constants';
import ColourUtil from './colour-util';

interface ThemeButtonProps {
    theme: Theme;
    onClick?: () => void;
}

export default function ThemeButton(props: ThemeButtonProps) {
    const { theme, onClick } = props;

    const { t } = useTranslation();

    return (
        <IconButton
            aria-label={t('Color')}
            color={theme[3]}
            bg={theme[2]}
            size="md"
            _hover={{ bg: ColourUtil.fade(theme[2], 0.7) }}
            icon={<MdCircle />}
            onClick={onClick}
        />
    );
}
