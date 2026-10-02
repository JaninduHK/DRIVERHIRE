/* eslint-disable react-refresh/only-export-components */
import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import AdminDriverDetails from '../../src/pages/AdminDriverDetails.jsx';

export const meta = () => noindexMeta({ title: 'Driver record | Car with Driver LK Admin' });

const AdminDriverDetailsRoute = clientOnly(AdminDriverDetails);

export default AdminDriverDetailsRoute;
