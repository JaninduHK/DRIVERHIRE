import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login } from '../services/authApi.js';
import { consumeAuthMessage, consumeReturnPath, persistAuthSession } from '../services/authToken.js';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import FacebookSignInButton from '../components/FacebookSignInButton.jsx';
import AuthShell, { authInputCls, authSubmitCls, AuthLabel, AuthPasswordInput } from '../components/AuthShell.jsx';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const message = consumeAuthMessage();
    if (message) {
      toast.error(message);
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await login(formData);
      persistAuthSession({ token: response.token, user: response.user });

      const user = response?.user;
      const firstName = user?.name?.split(' ')?.[0] || 'there';
      toast.success(`Welcome back, ${firstName}!`);

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
            toast(
              'Your driver profile is pending approval. We will notify you once you are approved.',
              { icon: '⏳' }
            );
          }
        } else {
          destination = '/dashboard';
        }
      }

      navigate(destination);
    } catch (error) {
      toast.error(error.message || 'Unable to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="signin"
      social={
        <div className="grid gap-2.5">
          <GoogleSignInButton onLoadingChange={setLoading} context="signin" />
          <FacebookSignInButton onLoadingChange={setLoading} context="signin" />
        </div>
      }
    >
      <form className="mt-5 grid gap-4" onSubmit={handleSubmit} noValidate>
        <label className="block">
          <AuthLabel>Email address</AuthLabel>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={authInputCls}
          />
        </label>

        <AuthPasswordInput
          name="password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          rightSlot={
            <Link to="/forgot-password" className="text-[12.5px] font-bold text-brand-dark">
              Forgot password?
            </Link>
          }
        />

        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink-soft">
          <input type="checkbox" className="h-[19px] w-[19px] accent-brand" />
          Keep me signed in on this device
        </label>

        <button type="submit" disabled={loading} className={authSubmitCls}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
};

export default Login;
