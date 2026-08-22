import { CheckCircle2, RotateCcw } from 'lucide-react';
import { formatDate, tagClass } from './adminFormatters.js';

const UsersPanel = ({ state, onReload }) => {
  const { items: filtered, loading, error } = state;

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">Loading users…</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
        <button type="button" onClick={onReload} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-muted-soft">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] bg-surface shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-5 py-4">
        <b className="text-[15px] text-ink">Travellers <span className="font-semibold text-muted-soft">({filtered.length})</span></b>
        <button type="button" onClick={onReload} className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-muted transition hover:border-brand hover:text-brand-dark">Refresh</button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center text-sm text-muted">No users found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-hairline bg-canvas/60 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Auth</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">Bookings</th>
                <th className="px-5 py-3 text-center">Briefs</th>
                <th className="px-5 py-3">Registered</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-hairline text-[13px] last:border-b-0 hover:bg-canvas/60">
                  <td className="px-5 py-3 font-bold text-ink">{user.name}</td>
                  <td className="px-5 py-3">
                    <a href={`mailto:${user.email}`} className="font-semibold text-brand-dark hover:underline">{user.email}</a>
                  </td>
                  <td className="px-5 py-3">
                    <span className={tagClass(user.authProvider === 'local' ? 'grey' : 'blue')}>{user.authProvider}</span>
                  </td>
                  <td className="px-5 py-3">
                    {user.isVerified ? (
                      <span className={`${tagClass('green')} gap-1`}><CheckCircle2 className="h-3 w-3" /> Verified</span>
                    ) : (
                      <span className={tagClass('amber')}>Unverified</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center font-bold text-ink">{user.bookingsCount}</td>
                  <td className="px-5 py-3 text-center font-bold text-ink">{user.briefsCount}</td>
                  <td className="px-5 py-3 text-muted">{formatDate(user.registeredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersPanel;
