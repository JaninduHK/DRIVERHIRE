import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const buildAdminProfileForm = (profile) => ({
  name: profile?.name || '',
  contactNumber: profile?.contactNumber || '',
  address: profile?.address || '',
});

const inputCls =
  'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
const labelCls = 'block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft';

const AdminProfilePanel = ({ profile, loading, error, onRetry, onSave, onPasswordChange, savingProfile, savingPassword }) => {
  const [formState, setFormState] = useState(() => buildAdminProfileForm(profile));
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', password: '', confirmPassword: '' });

  useEffect(() => { setFormState(buildAdminProfileForm(profile)); }, [profile]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!onSave) return;
    try {
      await onSave({ name: formState.name, contactNumber: formState.contactNumber, address: formState.address });
    } catch (error) {
      console.warn('Admin profile update failed', error);
    }
  };

  const handlePasswordFieldChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!onPasswordChange) return;
    if (!passwordForm.password || passwordForm.password !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    try {
      await onPasswordChange({ currentPassword: passwordForm.currentPassword, password: passwordForm.password });
      setPasswordForm({ currentPassword: '', password: '', confirmPassword: '' });
    } catch (error) {
      console.warn('Admin password update failed', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading profile…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center text-sm text-rose-600 dark:text-rose-300">
        <p>{error}</p>
        <button type="button" onClick={onRetry} className="rounded-full border border-rose-200 dark:border-rose-400/30 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-rose-600 dark:text-rose-300 transition hover:border-rose-300">Retry</button>
      </div>
    );
  }

  if (!profile) {
    return <div className="flex min-h-[200px] items-center justify-center text-center text-sm text-muted">No profile details available.</div>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-4 rounded-[18px] bg-surface p-6 shadow-card">
        <header>
          <h2 className="text-[16px] font-extrabold text-ink">Profile details</h2>
          <p className="text-[12.5px] text-muted-soft">Update the information used across the admin console.</p>
        </header>
        <form onSubmit={handleProfileSubmit} className="space-y-3.5">
          <div>
            <label className={labelCls}>Name</label>
            <input name="name" value={formState.name} onChange={handleFieldChange} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Contact number</label>
            <input name="contactNumber" value={formState.contactNumber} onChange={handleFieldChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Office location</label>
            <input name="address" value={formState.address} onChange={handleFieldChange} className={inputCls} />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70">
              {savingProfile ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-[18px] bg-surface p-6 shadow-card">
        <header>
          <h2 className="text-[16px] font-extrabold text-ink">Reset password</h2>
          <p className="text-[12.5px] text-muted-soft">Choose a strong password to protect admin access.</p>
        </header>
        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          <div>
            <label className={labelCls}>Current password</label>
            <input name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={handlePasswordFieldChange} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>New password</label>
            <input name="password" type="password" value={passwordForm.password} onChange={handlePasswordFieldChange} className={inputCls} required minLength={8} />
          </div>
          <div>
            <label className={labelCls}>Confirm new password</label>
            <input name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={handlePasswordFieldChange} className={inputCls} required />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingPassword} className="inline-flex items-center gap-2 rounded-lg bg-[#0f1f2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0f1f2d]/90 disabled:cursor-not-allowed disabled:opacity-70">
              {savingPassword ? (<><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>) : 'Update password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default AdminProfilePanel;
