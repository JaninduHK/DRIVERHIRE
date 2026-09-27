/**
 * The published cancellation policy, as a calculation.
 *
 * Mirrors the three tiers in DriverTermsConditions.jsx (CANCELLATION_ROWS) and the
 * traveller-facing notice on the booking dashboard:
 *
 *   more than 2 days before the start date  -> nothing, free cancellation
 *   within 2 days of the start date         -> 50% of the total hire cost
 *   after the hire has started              -> 100% of completed days + 50% of the rest
 *
 * Computed from the booking's stored dates rather than frozen at cancellation
 * time, so it also works for bookings cancelled before this existed. The amount
 * is what the traveller owes the DRIVER — no money moves through the platform.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value) => {
  // new Date(null) is the epoch, not Invalid Date, so reject empties up front.
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

// Inclusive: a trip from the 17th to the 20th is 4 days.
const inclusiveDays = (from, to) => Math.max(1, Math.round((to - from) / DAY_MS) + 1);

export const FREE_CANCELLATION_DAYS = 2;

export const calculateCancellationFee = (booking = {}) => {
  const total = Number(booking.totalPrice) || 0;
  const start = startOfDay(booking.startDate);
  const end = startOfDay(booking.endDate);
  const cancelled = startOfDay(booking.cancelledAt);

  if (!start || !end || !cancelled || total <= 0) {
    return { amount: null, tier: 'unknown', label: 'Cannot calculate — missing dates' };
  }

  const daysUntilStart = Math.round((start - cancelled) / DAY_MS);

  if (daysUntilStart > FREE_CANCELLATION_DAYS) {
    return {
      amount: 0,
      tier: 'free',
      label: `Free — cancelled ${daysUntilStart} days before the start date`,
    };
  }

  if (daysUntilStart >= 0) {
    return {
      amount: Math.round(total * 0.5 * 100) / 100,
      tier: 'half',
      label:
        daysUntilStart === 0
          ? '50% — cancelled on the start date'
          : `50% — cancelled ${daysUntilStart} day${daysUntilStart === 1 ? '' : 's'} before the start date`,
    };
  }

  // Trip already under way: charge completed days in full, the remainder at half.
  const totalDays = inclusiveDays(start, end);
  const perDay = total / totalDays;
  const completedDays = Math.min(totalDays, Math.round((cancelled - start) / DAY_MS));
  const remainingDays = Math.max(0, totalDays - completedDays);
  const amount = completedDays * perDay + remainingDays * perDay * 0.5;

  return {
    amount: Math.round(amount * 100) / 100,
    tier: 'partial',
    label: `${completedDays} of ${totalDays} days completed, ${remainingDays} at 50%`,
  };
};

export default { calculateCancellationFee, FREE_CANCELLATION_DAYS };
