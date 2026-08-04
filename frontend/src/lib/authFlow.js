import toast from 'react-hot-toast';
import { consumeReturnPath, persistAuthSession } from '../services/authToken.js';

// Shared post-authentication flow for social sign-in (Google / Facebook).
// Persists the session, greets the user, and routes to the right destination.
export const completeSocialAuth = (result, navigate) => {
  persistAuthSession({ token: result.token, user: result.user });

  const user = result?.user;
  const firstName = user?.name?.split(' ')?.[0] || 'there';

  if (result.isNewUser) {
    toast.success(`Welcome to Car With Driver, ${firstName}!`);
  } else {
    toast.success(`Welcome back, ${firstName}!`);
  }

  const savedPath = consumeReturnPath();
  const destinationFromReturn = savedPath && !savedPath.startsWith('/register') ? savedPath : '';

  let destination = destinationFromReturn || '/';

  if (!destinationFromReturn) {
    if (user?.role === 'admin') {
      destination = '/admin';
    } else if (user?.role === 'driver') {
      if (user?.driverStatus === 'approved') {
        destination = '/portal/driver';
      } else {
        toast('Your driver profile is pending approval.', { icon: '⏳' });
      }
    } else {
      destination = '/dashboard';
    }
  }

  navigate(destination);
};
