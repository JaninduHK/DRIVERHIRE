import { Check, X } from 'lucide-react';
import { OFFER_INCLUSIONS } from '../constants/offerInclusions.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * The six offer inclusions as a tick/cross list: green tick for what the driver
 * included, red cross and grey text for what they did not.
 *
 * Renders nothing when `inclusions` is not an array — offers sent before
 * inclusions existed carry no list, and showing six crosses for those would
 * wrongly read as "nothing included".
 */
export const OfferInclusionList = ({ inclusions, className = '' }) => {
  const { t } = useI18n();
  if (!Array.isArray(inclusions)) {
    return null;
  }
  return (
    <ul className={`m-0 grid list-none gap-1 p-0 ${className}`}>
      {OFFER_INCLUSIONS.map(({ key }) => {
        const included = inclusions.includes(key);
        return (
          <li key={key} className={`flex items-start gap-1.5 text-[12.5px] leading-snug ${included ? 'font-semibold text-ink' : 'text-muted-soft'}`}>
            {included ? (
              <Check className="mt-[1px] h-4 w-4 flex-none text-emerald-600" strokeWidth={3.5} aria-hidden="true" />
            ) : (
              <X className="mt-[1px] h-4 w-4 flex-none text-rose-500" strokeWidth={2.5} aria-hidden="true" />
            )}
            <span>
              {t(`common.inclusions.${key}`)}
              <span className="sr-only">{included ? ` ${t('chat.included')}` : ` ${t('chat.notIncluded')}`}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
};

/** Checkbox group for the driver's offer forms. `value` is the array of selected keys. */
export const OfferInclusionPicker = ({ value = [], onChange, labelClassName = '' }) => {
  const toggle = (key) =>
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className={`p-0 ${labelClassName}`}>What's included in this price</legend>
      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
        {OFFER_INCLUSIONS.map(({ key, label }) => {
          const checked = value.includes(key);
          return (
            <label
              key={key}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-[12.5px] font-semibold transition ${
                checked ? 'border-brand bg-brand-tint text-ink' : 'border-[#e2e8ea] bg-white text-muted'
              }`}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(key)} className="h-4 w-4 flex-none accent-[#10a35a]" />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
      <p className="mt-1 text-[11.5px] text-muted-soft">Travellers see every item: ticked ones as included, the rest as not included.</p>
    </fieldset>
  );
};

export default OfferInclusionList;
