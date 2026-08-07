import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import AdminDashboard from '../../src/pages/AdminDashboard.jsx';

export const meta = () => noindexMeta({ title: "Admin | Car with Driver LK" });

export default clientOnly(AdminDashboard);
