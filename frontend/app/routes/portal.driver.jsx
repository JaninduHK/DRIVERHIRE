import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import DriverDashboard from '../../src/pages/DriverDashboard.jsx';

export const meta = () => noindexMeta({ title: "Driver dashboard | Car with Driver LK" });

export default clientOnly(DriverDashboard);
