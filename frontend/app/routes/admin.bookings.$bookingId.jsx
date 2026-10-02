/* eslint-disable react-refresh/only-export-components */
import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import AdminBookingDetails from '../../src/pages/AdminBookingDetails.jsx';

export const meta = () => noindexMeta({ title: 'Booking record | Car with Driver LK Admin' });

const AdminBookingDetailsRoute = clientOnly(AdminBookingDetails);

export default AdminBookingDetailsRoute;
