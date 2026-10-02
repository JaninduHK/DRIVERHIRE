/* eslint-disable react-refresh/only-export-components */
import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import AdminBriefDetails from '../../src/pages/AdminBriefDetails.jsx';

export const meta = () => noindexMeta({ title: 'Tour brief record | Car with Driver LK Admin' });

const AdminBriefDetailsRoute = clientOnly(AdminBriefDetails);

export default AdminBriefDetailsRoute;
