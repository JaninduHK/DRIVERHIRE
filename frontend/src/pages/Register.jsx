import { useEffect } from 'react';
import { SSO_LOGIN_URL } from '../services/authToken.js';

// Traveller registration moved to Asgardeo SSO. This route is kept (rather than
// removed outright) purely so existing bookmarks/links to /register don't 404.
// Goes straight to Asgardeo — deliberately not saveReturnPath()/redirectToSsoLogin(),
// since the current page (/register) isn't a useful place to land back on.
const Register = () => {
  useEffect(() => {
    window.location.replace(SSO_LOGIN_URL);
  }, []);

  return null;
};

export default Register;
