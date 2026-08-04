// Shared dashboard primitives for the carwithdriver.lk redesign (direction 1a).
// Tokens live in tailwind.config.js (brand / ink / muted / canvas / hairline / star).
import { Star } from 'lucide-react';

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'U';

const AVATAR_TONES = {
  brand: 'bg-brand text-white',
  amber: 'bg-[#fde9c8] text-[#a86a15]',
  blue: 'bg-[#d6e9fb] text-[#1d6fb8]',
  purple: 'bg-[#e7ddfb] text-[#6b3fc0]',
  ink: 'bg-ink text-white',
  light: 'bg-white text-brand',
};

// Colored rounded-square avatar with initials (design uses radius 11-13px).
// Pass `image` to render an uploaded profile photo; falls back to initials.
export const Avatar = ({ name, tone = 'brand', className = '', image = '' }) => (
  <div
    className={`grid place-items-center overflow-hidden rounded-xl font-extrabold ${AVATAR_TONES[tone] || AVATAR_TONES.brand} ${className}`}
  >
    {image ? (
      <img src={image} alt={name || 'Avatar'} className="h-full w-full object-cover" />
    ) : (
      getInitials(name)
    )}
  </div>
);

const CHIP_TONES = {
  success: 'bg-brand-tint text-brand-dark',
  warn: 'bg-[#fdf0d8] text-[#a86a15]',
  danger: 'bg-[#ffe4e9] text-[#e11d48]',
  neutral: 'bg-hairline text-muted',
};

// Status pill / badge (radius 8px, 11-12px bold uppercase).
export const Chip = ({ children, tone = 'success', className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide ${CHIP_TONES[tone] || CHIP_TONES.success} ${className}`}
  >
    {children}
  </span>
);

// Rounded status pill with an optional leading icon (used for "Approved" etc.).
export const Pill = ({ children, tone = 'success', className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${CHIP_TONES[tone] || CHIP_TONES.success} ${className}`}
  >
    {children}
  </span>
);

// Stat tile: big value + label, optional icon and star rendering.
export const StatTile = ({ value, label, star = false, dark = false }) => (
  <div
    className={`flex-1 rounded-2xl p-3.5 shadow-card ${dark ? 'bg-ink' : 'bg-white'}`}
  >
    <div
      className={`flex items-center gap-1 text-[22px] font-extrabold ${dark ? 'text-white' : 'text-ink'}`}
    >
      {value}
      {star ? <Star className="h-3.5 w-3.5 mt-0.5" fill="#f5b042" stroke="none" /> : null}
    </div>
    <div className={`text-[11.5px] font-semibold ${dark ? 'text-white/60' : 'text-muted-soft'}`}>
      {label}
    </div>
  </div>
);

// Progress track with brand gradient fill.
export const ProgressBar = ({ percent = 0, className = '' }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-[#eef1f0] ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-bright transition-[width] duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};

// Section heading row with an optional right-side action.
export const SectionHeading = ({ title, action, onActionClick }) => (
  <div className="mb-2.5 mt-5 flex items-center justify-between px-0.5">
    <h2 className="text-base font-extrabold tracking-tight text-ink">{title}</h2>
    {action ? (
      <button
        type="button"
        onClick={onActionClick}
        className="text-[13px] font-bold text-brand-dark hover:text-brand"
      >
        {action}
      </button>
    ) : null}
  </div>
);
