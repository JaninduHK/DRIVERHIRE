import { useCallback, useEffect, useState } from 'react';
import { useParams } from '../i18n/router.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { CalendarDays, Car, Loader2, LogIn, Route } from 'lucide-react';
import { fetchOfferInvite } from '../services/offerApi.js';
import { redirectToSsoLogin } from '../services/authToken.js';
import { OfferInclusionList } from '../components/OfferInclusions.jsx';
import { OfferAssurances } from '../components/OfferAssurances.jsx';

// English pages always showed British-style dates here ("5 Jan 2027").
const formatDateRange = (start, end, intl = 'en-GB') => {
  if (!start || !end) return '';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  try {
    const from = new Date(start).toLocaleDateString(intl, opts);
    const to = new Date(end).toLocaleDateString(intl, opts);
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

const STATUS_NOTICE = ['accepted', 'declined'];

const Panel = ({ children }) => (
  <div className="mx-auto w-full max-w-[560px] px-4 py-10">
    <div className="rounded-[20px] border border-[#e5ebe8] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,31,45,.35)] sm:p-8">
      {children}
    </div>
  </div>
);

const OfferFromEmail = () => {
  const { t, locale, intl, lp } = useI18n();
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, invite: null, error: '' });

  const load = useCallback(async () => {
    setState({ loading: true, invite: null, error: '' });
    try {
      const invite = await fetchOfferInvite(token);
      setState({ loading: false, invite, error: '' });
    } catch (error) {
      setState({ loading: false, invite: null, error: error.message || t('emailPages.linkError') });
    }
  }, [token, t]);

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
          <Loader2 className="h-4 w-4 animate-spin text-brand" /> {t('emailPages.offer.opening')}
        </div>
      </Panel>
    );
  }

  if (state.error) {
    return (
      <Panel>
        <h1 className="text-[20px] font-extrabold text-ink">{t('emailPages.offer.errorTitle')}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{state.error}</p>
        <a href={lp('/')} className="mt-5 inline-flex rounded-xl bg-brand px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark">
          {t('emailPages.goHome')}
        </a>
      </Panel>
    );
  }

  const { invite } = state;
  const dates = formatDateRange(invite.startDate, invite.endDate, locale === 'en' ? 'en-GB' : intl);
  const price = formatCurrency(invite.totalPrice, invite.currency);
  const notice = STATUS_NOTICE.includes(invite.status) ? t(`emailPages.offer.status.${invite.status}`) : null;

  return (
    <Panel>
      <h1 className="text-[22px] font-extrabold leading-tight text-ink">
        {t('emailPages.offer.title', { name: invite.driverName })}
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
            <span>{t('emailPages.offer.kms', { km: invite.totalKms })}</span>
          </div>
        ) : null}
        {invite.vehicleModel ? (
          <div className="flex items-center gap-2.5 text-[14px] text-ink">
            <Car className="h-4 w-4 shrink-0 text-brand" />
            <span>{invite.vehicleModel}</span>
          </div>
        ) : null}
        <OfferInclusionList inclusions={invite.inclusions} className="border-t border-[#e2e8ea] pt-3" />
      </div>
      <OfferAssurances startDate={invite.startDate} endDate={invite.endDate} assurances={invite.assurances} className="mt-3" />

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
        <LogIn className="h-4 w-4" /> {t('emailPages.offer.login')}
      </button>
      <p className="mt-3 text-center text-[12px] text-muted-soft">
        {t('emailPages.offer.loginHelp')}
      </p>
    </Panel>
  );
};

export default OfferFromEmail;
