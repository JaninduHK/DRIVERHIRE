import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import TravelerDashboard from '../../src/pages/TravelerDashboard.jsx';

export const meta = () => noindexMeta({ title: "Your dashboard | Car with Driver LK" });

export default clientOnly(TravelerDashboard);
