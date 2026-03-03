import { IconButton } from '@chakra-ui/react';
import React from 'react';
import { MdFavorite, MdFavoriteBorder } from 'react-icons/md';

interface FavoriteButtonProps {
    isFavorite: boolean;
    onToggle: () => void;
    ariaLabel: string;
}

/**
 * A heart-shaped favorite button that shows filled when favorited, outlined when not.
 */
const FavoriteButton: React.FC<FavoriteButtonProps> = ({ isFavorite, onToggle, ariaLabel }) => {
    return (
        <IconButton
            aria-label={ariaLabel}
            icon={isFavorite ? <MdFavorite /> : <MdFavoriteBorder />}
            onClick={e => {
                e.stopPropagation();
                onToggle();
            }}
            variant="ghost"
            size="sm"
            color="pink.400"
            _hover={{ color: 'pink.500' }}
            _focus={{ boxShadow: 'none' }}
        />
    );
};

export default FavoriteButton;
