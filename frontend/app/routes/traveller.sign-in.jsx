import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import TravellerSignIn from '../../src/pages/TravellerSignIn.jsx';

export const meta = () => noindexMeta({ title: "Sign in | Car with Driver LK" });

export default clientOnly(TravellerSignIn);
