import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, CircleUserRound, Loader2, Mail, RotateCcw, Send, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchSettings as fetchAdminSettings, updateSettings as updateAdminSettings } from '../../services/adminApi.js';
import { formatDate, tagClass } from './adminFormatters.js';

const DRIVER_STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };
const STATUS_TAGS = { pending: 'amber', approved: 'green', rejected: 'red' };

export const DriverApprovalSetting = () => {
  const [autoApproval, setAutoApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAdminSettings()
      .then((data) => { if (!cancelled) setAutoApproval(Boolean(data?.settings?.driverAutoApproval)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSet = async (value) => {
    if (value === autoApproval || saving) return;
    const previous = autoApproval;
    setSaving(true);
    setAutoApproval(value);
    try {
      const response = await updateAdminSettings({ driverAutoApproval: value });
      setAutoApproval(Boolean(response?.settings?.driverAutoApproval));
      toast.success(response?.message || 'Setting updated.');
    } catch (err) {
      setAutoApproval(previous);
      toast.error(err.message || 'Unable to update setting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-surface p-5 shadow-card">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Driver approval</p>
        <b className="text-[15px] text-ink">New driver applications</b>
        <p className="mt-1 max-w-xl text-[12.5px] text-muted">
          {autoApproval
            ? 'New drivers are approved automatically and can start once they verify their email.'
            : 'New drivers stay pending until you approve them here.'}
        </p>
      </div>
      <div className="inline-flex rounded-xl bg-canvas p-1">
        {[{ value: false, label: 'Manual' }, { value: true, label: 'Automatic' }].map((option) => {
          const active = autoApproval === option.value;
          return (
            <button
              key={option.label}
              type="button"
              disabled={loading || saving}
              onClick={() => handleSet(option.value)}
              className={`min-w-[92px] rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active ? 'bg-surface text-ink shadow-sm' : 'text-muted-soft hover:text-muted'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DriversPanel = ({ state, onRetry, onStatusChange, onSendMessage }) => {
  const { items: filtered, loading, error, updatingId } = state;
  const [expandedId, setExpandedId] = useState(null);
  const [messageForm, setMessageForm] = useState({ driverId: null, subject: '', message: '', sending: false, error: '' });

  const toggleExpanded = (driverId) => setExpandedId((prev) => (prev === driverId ? null : driverId));

  const toggleMessageForm = (driverId) => {
    setMessageForm((prev) => {
      const shouldClose = !driverId || prev.driverId === driverId;
      if (shouldClose) return { driverId: null, subject: '', message: '', sending: false, error: '' };
      return { driverId, subject: '', message: '', sending: false, error: '' };
    });
  };

  const handleMessageFieldChange = (event) => {
    const { name, value } = event.target;
    setMessageForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMessageSubmit = async (event) => {
    event.preventDefault();
    if (!messageForm.driverId || !onSendMessage) return;
    const trimmedSubject = messageForm.subject.trim();
    const trimmedMessage = messageForm.message.trim();
    if (trimmedSubject.length < 3) {
      setMessageForm((prev) => ({ ...prev, error: 'Subject must be at least 3 characters.' }));
      return;
    }
    if (trimmedMessage.length < 10) {
      setMessageForm((prev) => ({ ...prev, error: 'Message must be at least 10 characters.' }));
      return;
    }
    setMessageForm((prev) => ({ ...prev, sending: true, error: '' }));
    try {
      await onSendMessage(messageForm.driverId, { subject: trimmedSubject, message: trimmedMessage });
      toast.success('Email sent to driver.');
      setMessageForm({ driverId: null, subject: '', message: '', sending: false, error: '' });
    } catch (submitError) {
      setMessageForm((prev) => ({ ...prev, sending: false, error: submitError?.message || 'Unable to send email.' }));
      toast.error(submitError?.message || 'Unable to send email.');
    }
  };

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">Loading driver applications…</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-muted-soft">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] bg-surface shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-5 py-4">
        <b className="text-[15px] text-ink">Driver applications <span className="font-semibold text-muted-soft">({filtered.length})</span></b>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
          <CircleUserRound className="h-9 w-9 text-muted-soft" />
          <p>No driver applications have been submitted yet.</p>
        </div>
      ) : (
        filtered.map((application) => {
          const isUpdating = updatingId === application.id;
          const disableApprove = isUpdating || application.driverStatus === DRIVER_STATUS.APPROVED;
          const disableReject = isUpdating || application.driverStatus === DRIVER_STATUS.REJECTED;
          const isFormOpen = messageForm.driverId === application.id;
          const isSendingMessage = isFormOpen && messageForm.sending;
          const isExpanded = expandedId === application.id;

          return (
            <div key={application.id} className="border-b border-hairline last:border-b-0">
              <button
                type="button"
                onClick={() => toggleExpanded(application.id)}
                className="grid w-full grid-cols-[1.3fr_1.4fr_1.1fr_.8fr_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-canvas"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <b className="truncate text-[13.5px] text-ink">{application.name}</b>
                  <span className={tagClass(STATUS_TAGS[application.driverStatus] || 'amber')}>{application.driverStatus || DRIVER_STATUS.PENDING}</span>
                </div>
                <div className="truncate text-[12.5px] font-semibold text-muted-soft">{application.email}</div>
                <div className="truncate text-[12.5px] text-muted-soft">{application.address || 'Address not provided'}</div>
                <div className="text-[12px] text-muted-soft">{formatDate(application.createdAt)}</div>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-soft transition ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded ? (
                <div className="border-t border-hairline bg-canvas/60 px-5 py-4">
                  <p className="text-[13px] text-muted">{application.description || 'No bio provided.'}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[12.5px] text-muted">
                    <span>Contact: {application.contactNumber || 'Not shared'}</span>
                    {application.tripAdvisor ? (
                      <a href={application.tripAdvisor} target="_blank" rel="noreferrer" className="font-bold text-brand-dark hover:underline">View TripAdvisor profile</a>
                    ) : (
                      <span className="text-muted-soft">TripAdvisor link not provided</span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={disableApprove}
                      onClick={() => { if (!disableApprove) onStatusChange(application.id, DRIVER_STATUS.APPROVED); }}
                      className={`inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition ${disableApprove ? 'cursor-not-allowed opacity-60' : 'hover:bg-emerald-100 dark:hover:bg-emerald-400/20'}`}
                    >
                      <CheckCircle2 className="h-4 w-4" /> {isUpdating ? 'Updating…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={disableReject}
                      onClick={() => { if (!disableReject) onStatusChange(application.id, DRIVER_STATUS.REJECTED); }}
                      className={`inline-flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 transition ${disableReject ? 'cursor-not-allowed opacity-60' : 'hover:bg-rose-100 dark:hover:bg-rose-400/20'}`}
                    >
                      <XCircle className="h-4 w-4" /> {isUpdating ? 'Updating…' : 'Reject'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMessageForm(application.id)}
                      disabled={isSendingMessage}
                      className={`inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink transition ${isFormOpen ? 'bg-surface' : 'bg-surface hover:border-muted-soft'}`}
                    >
                      <Mail className="h-4 w-4" /> {isFormOpen ? (isSendingMessage ? 'Sending…' : 'Close email form') : 'Email driver'}
                    </button>
                  </div>

                  {isFormOpen ? (
                    <form onSubmit={handleMessageSubmit} className="mt-3 space-y-3 rounded-xl border border-hairline bg-surface p-4">
                      {messageForm.error ? <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{messageForm.error}</p> : null}
                      <div>
                        <label className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Subject</label>
                        <input
                          name="subject"
                          type="text"
                          value={messageForm.subject}
                          onChange={handleMessageFieldChange}
                          disabled={isSendingMessage}
                          maxLength={120}
                          placeholder="e.g. New platform update"
                          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Message</label>
                        <textarea
                          name="message"
                          rows={4}
                          value={messageForm.message}
                          onChange={handleMessageFieldChange}
                          disabled={isSendingMessage}
                          maxLength={2000}
                          placeholder="Share updates, reminders, or policy changes."
                          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={isSendingMessage} className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">
                          {isSendingMessage ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>) : (<><Send className="h-4 w-4" /> Send email</>)}
                        </button>
                        <button type="button" disabled={isSendingMessage} onClick={() => toggleMessageForm(application.id)} className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
};

export default DriversPanel;
