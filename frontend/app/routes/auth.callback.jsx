import { clientOnly } from '../lib/clientRoute.jsx';
import { noindexMeta } from '../lib/seo.js';
import AuthCallback from '../../src/pages/AuthCallback.jsx';

export const meta = () => noindexMeta({ title: "Signing in… | Car with Driver LK" });

export default clientOnly(AuthCallback);
