import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, Car, Loader2, LogIn, Route } from 'lucide-react';
import { fetchOfferInvite } from '../services/offerApi.js';
import { redirectToSsoLogin } from '../services/authToken.js';

const formatDateRange = (start, end) => {
  if (!start || !end) return '';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  try {
    const from = new Date(start).toLocaleDateString('en-GB', opts);
    const to = new Date(end).toLocaleDateString('en-GB', opts);
    return from === to ? from : `${from} – ${to}`;
  } catch {
    return '';
  }
};

const formatCurrency = (value, currency) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(numericValue);
  } catch {
    return `${currency || ''} ${numericValue}`.trim();
  }
};

const STATUS_NOTICE = {
  accepted: 'You already accepted this offer — open your dashboard to see the booking.',
  declined: 'This offer is no longer open.',
};

const Panel = ({ children }) => (
  <div className="mx-auto w-full max-w-[560px] px-4 py-10">
    <div className="rounded-[20px] border border-[#e5ebe8] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,31,45,.35)] sm:p-8">
      {children}
    </div>
  </div>
);

const OfferFromEmail = () => {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, invite: null, error: '' });

  const load = useCallback(async () => {
    setState({ loading: true, invite: null, error: '' });
    try {
      const invite = await fetchOfferInvite(token);
      setState({ loading: false, invite, error: '' });
    } catch (error) {
      setState({ loading: false, invite: null, error: error.message || 'This link could not be opened.' });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const goToConversation = (conversationId) => {
    const returnPath = `/dashboard?tab=messages&conversationId=${conversationId}`;
    redirectToSsoLogin(returnPath);
  };

  if (state.loading) {
    return (
      <Panel>
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand" /> Opening your offer…
        </div>
      </Panel>
    );
  }

  if (state.error) {
    return (
      <Panel>
        <h1 className="text-[20px] font-extrabold text-ink">We couldn&apos;t open this offer</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{state.error}</p>
        <a href="/" className="mt-5 inline-flex rounded-xl bg-brand px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark">
          Go to homepage
        </a>
      </Panel>
    );
  }

  const { invite } = state;
  const dates = formatDateRange(invite.startDate, invite.endDate);
  const price = formatCurrency(invite.totalPrice, invite.currency);
  const notice = STATUS_NOTICE[invite.status];

  return (
    <Panel>
      <h1 className="text-[22px] font-extrabold leading-tight text-ink">
        Trip offer from {invite.driverName}
      </h1>
      {invite.vehicleModel ? (
        <p className="mt-1.5 text-[13.5px] text-muted-soft">{invite.vehicleModel}</p>
      ) : null}

      {notice ? (
        <p className="mt-4 rounded-xl bg-[#f1f5f9] px-4 py-3 text-[13.5px] font-semibold text-ink">{notice}</p>
      ) : null}

      <div className="mt-5 space-y-3 rounded-2xl border border-[#e2e8ea] bg-[#f9fbfa] p-4">
        {dates ? (
          <div className="flex items-center gap-2.5 text-[14px] text-ink">
            <CalendarDays className="h-4 w-4 shrink-0 text-brand" />
            <span>{dates}</span>
          </div>
        ) : null}
        {invite.totalKms ? (
          <div className="flex items-center gap-2.5 text-[14px] text-ink">
            <Route className="h-4 w-4 shrink-0 text-brand" />
            <span>{invite.totalKms} km included</span>
          </div>
        ) : null}
        {invite.vehicleModel ? (
          <div className="flex items-center gap-2.5 text-[14px] text-ink">
            <Car className="h-4 w-4 shrink-0 text-brand" />
            <span>{invite.vehicleModel}</span>
          </div>
        ) : null}
      </div>

      {price ? (
        <p className="mt-5 text-[26px] font-extrabold text-ink">{price}</p>
      ) : null}

      {invite.note ? (
        <blockquote className="mt-4 rounded-xl border-l-4 border-[#0f172a] bg-[#f1f5f9] px-4 py-3 text-[14px] leading-relaxed text-ink">
          {invite.note}
        </blockquote>
      ) : null}

      <button
        type="button"
        onClick={() => goToConversation(invite.conversationId)}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-[15px] font-bold text-white transition hover:bg-brand-dark"
      >
        <LogIn className="h-4 w-4" /> Log in to reply
      </button>
      <p className="mt-3 text-center text-[12px] text-muted-soft">
        You&apos;ll be taken straight to this conversation once you&apos;re signed in.
      </p>
    </Panel>
  );
};

export default OfferFromEmail;
