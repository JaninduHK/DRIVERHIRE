import { useI18n } from '../i18n/I18nProvider.jsx';

// A date input that always tells people what to do. Safari on iPhone shows an
// empty date input as a blank box, and desktop browsers show "mm/dd/yyyy" in the
// US order whatever the visitor's country; both mislead. While the field is empty
// and not being edited, the browser's own text is hidden and a plain
// "Select date" hint is shown in its place. Takes every prop a normal <input>
// does; spacing classes (mt-1, …) are moved to the wrapper so the hint lines up.
const OUTER = /^(?:[a-z]+:)*-?(?:m[trblxy]?|self|col|row|order|flex|grow|shrink|basis)-/;
const HINT = /^(?:[a-z]+:)*(?:p[xl]?|text|font)-/;

const DateField = ({ className = '', value, placeholder, type = 'date', ...props }) => {
  const { t } = useI18n();
  const classes = className.split(/\s+/).filter(Boolean);
  const outer = classes.filter((name) => OUTER.test(name)).join(' ');
  const inner = classes.filter((name) => !OUTER.test(name)).join(' ');
  const hint = classes.filter((name) => HINT.test(name) && !/^(?:[a-z]+:)*text-(?:ink|white|slate|gray|muted|brand|\[#)/.test(name)).join(' ');
  const empty = !value;

  return (
    <span className={`relative block min-w-0 ${outer}`}>
      <input type={type} value={value ?? ''} data-empty={empty ? 'true' : undefined} className={`date-field ${inner}`} {...props} />
      {empty ? (
        <span
          aria-hidden="true"
          className={`date-field-hint pointer-events-none absolute inset-y-0 left-0 right-7 flex min-w-0 items-center border-l border-transparent text-muted-soft ${hint}`}
        >
          {/* Stops short of the browser's calendar icon on the right. */}
          <span className="min-w-0 truncate">
            {placeholder || (type === 'time' ? t('common.date.selectTime') : t('common.date.select'))}
          </span>
        </span>
      ) : null}
    </span>
  );
};

export default DateField;
