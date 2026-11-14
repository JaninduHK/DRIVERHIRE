import { MAX_SERVICE_AREAS, SERVICE_AREAS } from '../constants/locations.js';

/**
 * "Also available in": up to MAX_SERVICE_AREAS city areas a driver regularly picks
 * up from, besides their base town. `value` is a list of area slugs.
 */
const ServiceAreasPicker = ({ value = [], onChange, disabled = false }) => {
  const selected = Array.isArray(value) ? value : [];
  const full = selected.length >= MAX_SERVICE_AREAS;
  const toggle = (slug) => {
    if (selected.includes(slug)) onChange?.(selected.filter((item) => item !== slug));
    else if (!full) onChange?.([...selected, slug]);
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {SERVICE_AREAS.map((area) => {
          const on = selected.includes(area.slug);
          const blocked = !on && full;
          return (
            <button
              key={area.slug}
              type="button"
              disabled={disabled || blocked}
              aria-pressed={on}
              onClick={() => toggle(area.slug)}
              className={`rounded-full px-3.5 py-2 text-[12.5px] font-bold transition ${
                on ? 'bg-brand text-white' : 'border border-[#e2e8ea] bg-white text-ink-soft hover:border-brand'
              } ${blocked ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              {area.name}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11.5px] text-muted-soft">
        Optional. Pick up to {MAX_SERVICE_AREAS} areas where you regularly pick up travellers ({selected.length} of {MAX_SERVICE_AREAS} chosen).
      </p>
    </div>
  );
};

export default ServiceAreasPicker;
