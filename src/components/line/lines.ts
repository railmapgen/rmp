import { LineType } from '../../constants/constants';
import diagonalLine from './diagonal-line';
import perpendicularLine from './perpendicular-line';

const lines = {
    [LineType.Diagonal]: diagonalLine,
    [LineType.Perpendicular]: perpendicularLine,
};

export default lines;
