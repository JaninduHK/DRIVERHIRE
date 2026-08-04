import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { register as registerUser } from '../services/authApi.js';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import FacebookSignInButton from '../components/FacebookSignInButton.jsx';
import AuthShell, { authInputCls, authSubmitCls, AuthLabel, AuthPasswordInput } from '../components/AuthShell.jsx';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: 'guest',
    };

    try {
      await registerUser(payload);
      toast.success('Registration successful! Please verify your email to activate your account.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Unable to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="register"
      social={
        <div className="grid gap-2.5">
          <GoogleSignInButton onLoadingChange={setLoading} context="signup" />
          <FacebookSignInButton onLoadingChange={setLoading} context="signup" />
        </div>
      }
      footerNote={
        <p className="mt-3 text-[12.5px] leading-[1.6] text-muted-soft">
          Are you a driver?{' '}
          <Link to="/register/driver" className="font-bold text-brand-dark">
            Submit your application here
          </Link>
          .
        </p>
      }
    >
      <form className="mt-5 grid gap-4" onSubmit={handleSubmit} noValidate>
        <label className="block">
          <AuthLabel>Full name</AuthLabel>
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="Jane Doe"
            className={authInputCls}
          />
        </label>

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
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={handleChange}
          placeholder="Create a password"
          hint="At least 8 characters with one number. You can change it any time from your account."
        />

        <button type="submit" disabled={loading} className={authSubmitCls}>
          {loading ? 'Creating account…' : 'Create my account'}
        </button>
      </form>
    </AuthShell>
  );
};

export default Register;
