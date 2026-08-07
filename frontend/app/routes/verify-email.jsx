import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import VerifyEmail from '../../src/pages/VerifyEmail.jsx';

export const meta = () => noindexMeta({ title: "Verify your email | Car with Driver LK" });

export default clientOnly(VerifyEmail);
