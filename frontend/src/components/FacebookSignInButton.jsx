import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { facebookAuth } from '../services/authApi.js';
import { completeSocialAuth } from '../lib/authFlow.js';

const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
const FB_SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';
const FB_SDK_ID = 'facebook-jssdk';

const FacebookSignInButton = ({ onLoadingChange, context = 'signin' }) => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!FACEBOOK_APP_ID) {
      return;
    }
    if (window.FB) {
      setReady(true);
      return;
    }

    window.fbAsyncInit = function fbAsyncInit() {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v19.0',
      });
      setReady(true);
    };

    if (!document.getElementById(FB_SDK_ID)) {
      const script = document.createElement('script');
      script.id = FB_SDK_ID;
      script.src = FB_SDK_URL;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }, []);

  const handleClick = () => {
    if (!window.FB) {
      toast.error('Facebook sign-in is not ready yet. Please try again in a moment.');
      return;
    }

    window.FB.login(
      (response) => {
        const accessToken = response?.authResponse?.accessToken;
        if (response?.status !== 'connected' || !accessToken) {
          // User cancelled or did not authorise — stay put silently.
          return;
        }

        onLoadingChange?.(true);
        facebookAuth(accessToken)
          .then((result) => completeSocialAuth(result, navigate))
          .catch((error) => toast.error(error.message || 'Unable to sign in with Facebook.'))
          .finally(() => onLoadingChange?.(false));
      },
      { scope: 'public_profile,email' }
    );
  };

  if (!FACEBOOK_APP_ID) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!ready}
      className="inline-flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-[13px] border-[1.5px] border-[#dde4e1] bg-white text-[14.5px] font-bold text-ink transition hover:border-[#c7d0cc] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg width="17" height="17" viewBox="0 0 18 18" fill="#1877F2" aria-hidden="true">
        <path d="M18 9a9 9 0 1 0-10.4 8.9v-6.3H5.3V9h2.3V7c0-2.3 1.4-3.6 3.5-3.6 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.4.7-1.4 1.4V9h2.5l-.4 2.6h-2.1v6.3A9 9 0 0 0 18 9z" />
      </svg>
      {context === 'signup' ? 'Sign up with Facebook' : 'Continue with Facebook'}
    </button>
  );
};

export default FacebookSignInButton;
