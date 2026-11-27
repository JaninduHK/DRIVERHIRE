// An offer message's text is built on the server as an English summary of the
// offer (vehicle, dates, total: already shown on the card), followed by
// "\n\nNotes: <driver's own words>". The card shows the driver's note on its
// own and keeps only the part of the summary the card doesn't already show:
// the route of a tour-request offer.
const NOTE_MARKER = '\n\nNotes: ';
const BRIEF_PREFIX = 'Offer for your tour brief ';

export const splitOfferBody = (body) => {
  const text = String(body || '');
  const at = text.indexOf(NOTE_MARKER);
  const head = (at >= 0 ? text.slice(0, at) : text).trim();
  const note = at >= 0 ? text.slice(at + NOTE_MARKER.length).trim() : '';
  let route = '';
  let extra = '';
  if (head.startsWith(BRIEF_PREFIX)) {
    route = head.split('\n')[0].slice(BRIEF_PREFIX.length).trim();
  } else if (head && !head.startsWith('Offer:')) {
    extra = head; // older or unusual messages: show as written
  }
  return { note, route, extra };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const utcDay = (value) => {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

/** Number of trip days, counting both the first and the last day. */
export const offerTripDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  return Math.max(1, Math.round((utcDay(endDate) - utcDay(startDate)) / DAY_MS) + 1);
};
