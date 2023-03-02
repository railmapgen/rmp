import React from 'react';
import ColourUtil from './colour-util';
import { MdCircle } from 'react-icons/md';
import { IconButton } from '@chakra-ui/react';
import { Theme } from '../../constants/constants';
import { useTranslation } from 'react-i18next';

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
            size="lg"
            style={{ minHeight: 50, minWidth: 50, maxHeight: 50, maxWidth: 50 }}
            _hover={{ bg: ColourUtil.fade(theme[2], 0.7) }}
            icon={<MdCircle />}
            onClick={onClick}
        />
    );
}
