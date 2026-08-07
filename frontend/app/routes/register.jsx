import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import Register from '../../src/pages/Register.jsx';

export const meta = () => noindexMeta({ title: "Create an account | Car with Driver LK" });

export default clientOnly(Register);
