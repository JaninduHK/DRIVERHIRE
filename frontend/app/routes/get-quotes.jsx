import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import GetQuotes from '../../src/pages/GetQuotes.jsx';

export const meta = () => noindexMeta({ title: 'Get quotes from drivers | Car with Driver LK' });

export default clientOnly(GetQuotes);
