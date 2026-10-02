/* eslint-disable react-refresh/only-export-components */
import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import AdminVehicleDetails from '../../src/pages/AdminVehicleDetails.jsx';

export const meta = () => noindexMeta({ title: 'Vehicle record | Car with Driver LK Admin' });

const AdminVehicleDetailsRoute = clientOnly(AdminVehicleDetails);

export default AdminVehicleDetailsRoute;
