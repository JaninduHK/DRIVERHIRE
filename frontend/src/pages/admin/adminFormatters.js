// Shared formatting helpers used across every admin dashboard panel.

export const formatDateInput = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
};

export const formatPercentValue = (value, maximumFractionDigits = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0%';
  }
  return `${numeric.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : Math.min(1, maximumFractionDigits),
    maximumFractionDigits,
  })}%`;
};

export const formatCurrency = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '$0';
  }
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
};

export const formatDate = (dateString) => {
  if (!dateString) {
    return '—';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Shared status-tag color system (mirrors the mock's amber/blue/green/red/grey tags),
// mapped onto standard Tailwind palette classes already used elsewhere in this codebase.
// `dark:` variants key off AdminShell's `.admin-dark` toggle (see tailwind.config.js).
export const TAG_STYLES = {
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
  red: 'bg-rose-50 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300',
  grey: 'bg-slate-100 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300',
};

export const tagClass = (kind) => `inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${TAG_STYLES[kind] || TAG_STYLES.grey}`;
