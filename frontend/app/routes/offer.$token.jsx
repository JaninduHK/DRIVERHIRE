import { clientOnly } from '../lib/clientRoute.jsx';
import { metaLocale, noindexMeta } from '../lib/seo.js';
import OfferFromEmail from '../../src/pages/OfferFromEmail.jsx';

// Client-only + noindex: the URL carries a view token, so it must never be
// server-rendered into a crawlable page.
export const meta = ({ location }) => noindexMeta({ title: metaLocale(location).t('meta.private.offer') });

export default clientOnly(OfferFromEmail);
