import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import DriverMessages from '../../src/pages/DriverMessages.jsx';

export const meta = () => noindexMeta({ title: "Messages | Car with Driver LK" });

export default clientOnly(DriverMessages);
