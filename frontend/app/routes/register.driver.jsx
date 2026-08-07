import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import DriverRegister from '../../src/pages/DriverRegister.jsx';

export const meta = () => noindexMeta({ title: "Become a driver | Car with Driver LK" });

export default clientOnly(DriverRegister);
