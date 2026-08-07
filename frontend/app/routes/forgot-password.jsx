import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import ForgotPassword from '../../src/pages/ForgotPassword.jsx';

export const meta = () => noindexMeta({ title: "Reset your password | Car with Driver LK" });

export default clientOnly(ForgotPassword);
