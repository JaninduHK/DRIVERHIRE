import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import ResetPassword from '../../src/pages/ResetPassword.jsx';

export const meta = () => noindexMeta({ title: "Reset your password | Car with Driver LK" });

export default clientOnly(ResetPassword);
