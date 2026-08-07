import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import TourBriefsBoard from '../../src/pages/TourBriefsBoard.jsx';

export const meta = () => noindexMeta({ title: "Tour briefs | Car with Driver LK" });

export default clientOnly(TourBriefsBoard);
