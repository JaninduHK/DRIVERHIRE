import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import Checkout from '../../src/pages/Checkout.jsx';

export const meta = () => noindexMeta({ title: "Checkout | Car with Driver LK" });

export default clientOnly(Checkout);
