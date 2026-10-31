import { clientOnly } from '../lib/clientRoute.jsx';
import { metaLocale, noindexMeta } from '../lib/seo.js';
import TravelerDashboard from '../../src/pages/TravelerDashboard.jsx';

export const meta = ({ location }) => noindexMeta({ title: metaLocale(location).t('meta.private.dashboard') });

export default clientOnly(TravelerDashboard);
