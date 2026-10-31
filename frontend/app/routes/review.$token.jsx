import { clientOnly } from '../lib/clientRoute.jsx';
import { metaLocale, noindexMeta } from '../lib/seo.js';
import ReviewFromEmail from '../../src/pages/ReviewFromEmail.jsx';

// Client-only + noindex: the URL carries a single-use review token, so it must
// never be server-rendered into a crawlable page.
export const meta = ({ location }) => noindexMeta({ title: metaLocale(location).t('meta.private.review') });

export default clientOnly(ReviewFromEmail);
