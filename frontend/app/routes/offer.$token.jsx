import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import OfferFromEmail from '../../src/pages/OfferFromEmail.jsx';

// Client-only + noindex: the URL carries a view token, so it must never be
// server-rendered into a crawlable page.
export const meta = () => noindexMeta({ title: 'Your trip offer | Car with Driver LK' });

export default clientOnly(OfferFromEmail);
