import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import ReviewFromEmail from '../../src/pages/ReviewFromEmail.jsx';

// Client-only + noindex: the URL carries a single-use review token, so it must
// never be server-rendered into a crawlable page.
export const meta = () => noindexMeta({ title: 'Leave a review | Car with Driver LK' });

export default clientOnly(ReviewFromEmail);
