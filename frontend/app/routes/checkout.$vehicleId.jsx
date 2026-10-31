import { clientOnly } from '../lib/clientRoute.jsx';
import { metaLocale, noindexMeta } from '../lib/seo.js';
import Checkout from '../../src/pages/Checkout.jsx';

export const meta = ({ location }) => noindexMeta({ title: metaLocale(location).t('meta.private.checkout') });

export default clientOnly(Checkout);
