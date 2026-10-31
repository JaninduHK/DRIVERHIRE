import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * The tour brief (quote request) shown inside a conversation as a message from
 * the traveller, so both driver and traveller see the original request above
 * the driver's offer. The itinerary text is clamped to a few lines with a
 * Read more / Read less toggle. Contact details are already redacted server-side
 * (the stored briefRequest.message is sanitized), so nothing extra is needed here.
 */
const fmtDate = (value, intl = 'en-US') => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(intl, { month: 'short', day: 'numeric', year: 'numeric' });
};

const CLAMP_STYLE = {
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const BriefRequestBubble = ({ message, align }) => {
  const { t, intl } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const brief = message.briefRequest || {};

  const route = [brief.startLocation, brief.endLocation].filter(Boolean).join(' → ');
  const dates = [fmtDate(brief.startDate, intl), fmtDate(brief.endDate, intl)].filter(Boolean).join(' – ');
  const adults = brief.adults ?? 0;
  const children = brief.children ?? 0;
  const guests =
    adults || children
      ? `${t('chat.brief.adults', { count: adults })}${
          children > 0 ? `, ${t('chat.brief.children', { count: children })}` : ''
        }`
      : '';
  const meta = [dates, guests, brief.country].filter(Boolean).join(' · ');

  const text = (brief.message || '').trim();
  const isLong = text.length > 160 || text.split('\n').length > 3;

  return (
    <div className={`flex ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[88%] rounded-[16px] border-[1.5px] border-[#e3e8ec] bg-[#f7f9fa] p-3.5 shadow-[0_4px_14px_rgba(15,31,45,0.05)]">
        <span className="inline-block rounded-[7px] bg-[#eef2f5] px-2 py-[3px] text-[10.5px] font-extrabold uppercase tracking-wide text-muted">
          {t('chat.brief.label')}
        </span>
        {route ? <div className="mt-2 text-[13.5px] font-bold text-ink">{route}</div> : null}
        {meta ? <div className="mt-0.5 text-[12px] text-muted-soft">{meta}</div> : null}
        {text ? (
          <>
            <div
              className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted"
              style={!expanded && isLong ? CLAMP_STYLE : undefined}
            >
              {text}
            </div>
            {isLong ? (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="mt-1 text-[12px] font-bold text-brand transition hover:underline"
              >
                {expanded ? t('chat.brief.readLess') : t('chat.brief.readMore')}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default BriefRequestBubble;
