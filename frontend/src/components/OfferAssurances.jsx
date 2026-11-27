import { BadgeCheck, CalendarX2, ShieldCheck, Wallet } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';

const DAY_MS = 24 * 60 * 60 * 1000;

const utcDay = (value) => {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

/** True when the trip runs over more than one day (start and end on different days). */
export const isMultiDayTrip = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return Math.round((utcDay(endDate) - utcDay(startDate)) / DAY_MS) >= 1;
};

/**
 * "Good to know" lines under an offer: the answers to what travellers ask drivers
 * most. The two verification lines come from the server (`assurances`) and only
 * appear when true; payment and cancellation are platform terms for every offer.
 */
export const OfferAssurances = ({ startDate, endDate, assurances, className = '' }) => {
  const { t } = useI18n();
  const multiDay = isMultiDayTrip(startDate, endDate);
  const lines = [
    assurances?.licenceVerified ? { key: 'licence', icon: BadgeCheck, text: t('offer.assurance.licence') } : null,
    assurances?.insuranceVerified ? { key: 'insurance', icon: ShieldCheck, text: t('offer.assurance.insurance') } : null,
    { key: 'pay', icon: Wallet, text: multiDay ? t('offer.assurance.payMultiDay') : t('offer.assurance.paySingleDay') },
    { key: 'cancel', icon: CalendarX2, text: t('offer.assurance.cancel') },
  ].filter(Boolean);

  return (
    <div className={`rounded-xl bg-[#f3faf6] px-3 py-2.5 ${className}`}>
      <div className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-brand-dark">{t('offer.assurance.title')}</div>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {lines.map(({ key, icon: Icon, text }) => (
          <li key={key} className="flex items-start gap-1.5 text-[12.5px] font-semibold leading-snug text-ink">
            <Icon className="mt-[1px] h-4 w-4 flex-none text-brand" aria-hidden="true" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OfferAssurances;
