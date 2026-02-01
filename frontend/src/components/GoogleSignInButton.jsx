import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { googleAuth } from '../services/authApi.js';
import { consumeReturnPath, persistAuthSession } from '../services/authToken.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_GSI_URL = 'https://accounts.google.com/gsi/client';

const GoogleSignInButton = ({ onLoadingChange, context = 'signin' }) => {
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  const handleCredentialResponse = useCallback(
    async (response) => {
      if (!response?.credential) {
        toast.error('Google sign-in failed. Please try again.');
        return;
      }

      onLoadingChange?.(true);

      try {
        const result = await googleAuth(response.credential);
        persistAuthSession({ token: result.token, user: result.user });

        const user = result?.user;
        const firstName = user?.name?.split(' ')?.[0] || 'there';

        if (result.isNewUser) {
          toast.success(`Welcome to Car With Driver, ${firstName}!`);
        } else {
          toast.success(`Welcome back, ${firstName}!`);
        }

        const savedPath = consumeReturnPath();
        const destinationFromReturn =
          savedPath && !savedPath.startsWith('/register') ? savedPath : '';

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
      } catch (error) {
        toast.error(error.message || 'Unable to sign in with Google.');
      } finally {
        onLoadingChange?.(false);
      }
    },
    [navigate, onLoadingChange]
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google Client ID not configured');
      setScriptError(true);
      return;
    }

    // Check if script already loaded
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    // Check if script is loading
    const existingScript = document.querySelector(`script[src="${GOOGLE_GSI_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => setScriptLoaded(true));
      existingScript.addEventListener('error', () => setScriptError(true));
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = GOOGLE_GSI_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setScriptError(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !buttonRef.current || !GOOGLE_CLIENT_ID) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: context === 'signup' ? 'signup_with' : 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: buttonRef.current.offsetWidth || 320,
      });
    } catch (error) {
      console.error('Failed to initialize Google Sign-In:', error);
      setScriptError(true);
    }
  }, [scriptLoaded, handleCredentialResponse, context]);

  if (scriptError || !GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="relative my-6 flex items-center">
        <div className="flex-grow border-t border-slate-200" />
        <span className="mx-4 flex-shrink text-xs text-slate-400">or</span>
        <div className="flex-grow border-t border-slate-200" />
      </div>
      <div
        ref={buttonRef}
        className="flex w-full items-center justify-center"
        style={{ minHeight: '44px' }}
      />
    </div>
  );
};

export default GoogleSignInButton;
