import { Search, X } from 'lucide-react';

// Compact search box for a panel's own header. Controlled: the owner decides
// whether it filters locally or shares the admin header's search term.
const PanelSearch = ({ value, onChange, placeholder = 'Search…', className = '' }) => (
  <label className={`flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-ink ${className}`}>
    <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted-soft" strokeWidth={2} />
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full min-w-0 bg-transparent text-[12.5px] font-semibold text-ink placeholder:font-medium placeholder:text-muted-soft focus:outline-none"
    />
    {value ? (
      <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="flex-shrink-0 text-muted-soft hover:text-ink">
        <X className="h-3.5 w-3.5" />
      </button>
    ) : null}
  </label>
);

export default PanelSearch;
