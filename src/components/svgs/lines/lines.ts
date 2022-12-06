import { LineType } from '../../../constants/lines';
import diagonalLine from './diagonal-line';
import perpendicularLine from './perpendicular-line';
import simpleLine from './simple-line';

const lines = {
    [LineType.Diagonal]: diagonalLine,
    [LineType.Perpendicular]: perpendicularLine,
    [LineType.Simple]: simpleLine,
};

export default lines;
