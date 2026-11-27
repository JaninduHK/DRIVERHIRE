import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * The driver's own message on an offer card. Long messages are cut to a few
 * lines with Read more, so the price, inclusions and buttons stay in view.
 */
export const OfferNote = ({ text, label, className = '' }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el && !open) setClamped(el.scrollHeight > el.clientHeight + 2);
  }, [text, open]);

  if (!text) return null;
  return (
    <div className={`rounded-xl border-l-[3px] border-brand bg-canvas px-3 py-2.5 ${className}`}>
      <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted-soft">{label}</div>
      <p ref={ref} className={`m-0 mt-1 whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-ink ${open ? '' : 'line-clamp-5'}`}>
        {text}
      </p>
      {clamped || open ? (
        <button type="button" onClick={() => setOpen((value) => !value)} className="mt-1 text-[12px] font-extrabold text-brand-dark hover:underline">
          {open ? t('chat.brief.readLess') : t('chat.brief.readMore')}
        </button>
      ) : null}
    </div>
  );
};

export default OfferNote;
