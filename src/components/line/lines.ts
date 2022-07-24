import { LineType } from '../../constants/lines';
import diagonalLine from './diagonal-line';
import perpendicularLine from './perpendicular-line';

const lines = {
    [LineType.Diagonal]: diagonalLine,
    [LineType.Perpendicular]: perpendicularLine,
};

export default lines;
