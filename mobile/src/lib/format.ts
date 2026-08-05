export const initials = (name?: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const formatMoney = (value?: number | null, currency = '$'): string => {
  if (value == null || Number.isNaN(Number(value))) return `${currency}0`;
  const num = Number(value);
  const hasCents = Math.abs(num % 1) > 0.0001;
  return `${currency}${num.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

// Rates can be small decimals (e.g. $0.30/km) — always keep decimals for these.
export const formatRate = (value?: number | null, currency = '$'): string => {
  if (value == null || Number.isNaN(Number(value))) return `${currency}0.00`;
  return `${currency}${Number(value).toFixed(2)}`;
};

// Commission rates come as fractions (0.08) — render as a percentage.
export const formatPercent = (rate?: number | null, digits = 2): string => {
  if (rate == null || Number.isNaN(Number(rate))) return '—';
  return `${(Number(rate) * 100).toFixed(digits)}%`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatDate = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

export const formatDateRange = (start?: string | null, end?: string | null): string => {
  if (!start) return '';
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return '';
  if (!end) return formatDate(start);
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return formatDate(start);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()} to ${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} to ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
};

export const relativeTime = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return formatDate(value);
};

// Normalises `{ key: [...] } | [...]` list responses into a plain array.
export const asList = <T>(value: unknown, key: string): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>)[key])) {
    return (value as Record<string, T[]>)[key];
  }
  return [];
};

// Palette for avatar backgrounds, keyed off the name so it's stable.
const AVATAR_COLORS = [
  { bg: '#fde9c8', fg: '#a86a15' },
  { bg: '#d6e9fb', fg: '#1d6fb8' },
  { bg: '#e7ddfb', fg: '#6b3fc0' },
  { bg: '#e9f8ef', fg: '#0c8a4b' },
  { bg: '#fdecec', fg: '#d94b5a' },
];

export const avatarColor = (name?: string | null) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
