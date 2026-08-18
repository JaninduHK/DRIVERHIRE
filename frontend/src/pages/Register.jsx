import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Traveller registration moved to Asgardeo SSO. This route is kept (rather than
// removed outright) purely so existing bookmarks/links to /register don't 404.
const Register = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/traveller/sign-in', { replace: true });
  }, [navigate]);

  return null;
};

export default Register;
