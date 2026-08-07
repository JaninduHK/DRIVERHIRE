import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import Login from '../../src/pages/Login.jsx';

export const meta = () => noindexMeta({ title: "Sign in | Car with Driver LK" });

export default clientOnly(Login);
