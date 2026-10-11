import TourBrief from '../models/TourBrief.js';
import User, { EMAIL_PREFERENCES } from '../models/User.js';
import { repostBrief } from './briefController.js';
import { LINK_PURPOSES, verifyLinkToken } from '../utils/signedLinks.js';
import buildAppUrl from '../utils/url.js';

// ---------------------------------------------------------------------------
// Pages opened from links in traveller emails. All are UNAUTHENTICATED, same
// rationale as the offer-invite link: a preference or a one-tap answer that
// demands a sign-in first is one people answer by marking the email as spam.
// The signed token is the proof of identity and is scoped to one record and one
// purpose.
//
// Every link is a GET that only SHOWS a page; the change happens on the POST
// behind its button. Mail scanners and link previewers follow GET links on
// their own, and a link that acted on GET would close requests and change
// preferences without the traveller ever clicking.
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const BRAND = '#0f7a45';

const escapeHtml = (value = '') =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const page = ({ title, body }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;background:#eef2f1;font-family:${FONT};color:#0f172a;">
  <div style="max-width:520px;margin:8vh auto 0;padding:0 16px 40px;">
    <div style="background:#ffffff;border-radius:20px;padding:28px;">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
      ${body}
    </div>
  </div>
</body>
</html>`;

const paragraph = (text) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">${text}</p>`;
const buttonStyle = `display:inline-block;border:0;cursor:pointer;background:${BRAND};color:#ffffff;padding:14px 24px;border-radius:12px;font-family:${FONT};font-size:16px;font-weight:600;text-decoration:none;`;
const linkButton = (label, url) => `<a href="${url}" style="${buttonStyle}">${escapeHtml(label)}</a>`;
const radio = (name, value, label, hint, checked) => `
  <label style="display:block;margin:0 0 10px;padding:14px 16px;border:1px solid #cbd5e1;border-radius:12px;cursor:pointer;">
    <input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''} style="margin-right:8px;" />
    <strong style="font-size:15px;">${escapeHtml(label)}</strong>
    ${hint ? `<span style="display:block;margin:4px 0 0 24px;font-size:13px;line-height:1.5;color:#64748b;">${escapeHtml(hint)}</span>` : ''}
  </label>`;

const send = (res, status, title, body) => {
  res.set('Cache-Control', 'no-store');
  return res.status(status).send(page({ title, body }));
};

const invalidLink = (res) =>
  send(res, 404, 'This link is not valid', paragraph('It may have been cut off when it was copied. Open the link from the email again.'));

const failed = (res) =>
  send(res, 500, 'Something went wrong', paragraph('We could not save that just now. Please try the link again in a few minutes.'));

// ---- Email preferences ("Email me less often") ----------------------------

const PREFERENCE_OPTIONS = [
  { value: EMAIL_PREFERENCES.ALL, label: 'Every offer as it arrives', hint: 'One email each time a driver sends you an offer.' },
  { value: EMAIL_PREFERENCES.SUMMARY, label: 'A summary, at most once a day (recommended)', hint: 'Your first offer straight away, then our top picks in one email.' },
  { value: EMAIL_PREFERENCES.ESSENTIAL, label: 'Only messages from my drivers, and my bookings', hint: 'No offer alerts or reminders. You can still see every offer in your dashboard.' },
];

const preferencesForm = (current, saved) => `
  ${saved ? `<p style="margin:0 0 16px;padding:12px 14px;border-radius:12px;background:#eefaf3;font-size:14px;font-weight:600;color:${BRAND};">Saved. Your choice applies from now on.</p>` : ''}
  ${paragraph('Choose how often we email you about offers from drivers.')}
  <form method="post">
    ${PREFERENCE_OPTIONS.map((option) => radio('preference', option.value, option.label, option.hint, option.value === current)).join('')}
    <button type="submit" style="${buttonStyle}margin-top:8px;">Save my choice</button>
  </form>
  <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64748b;">Whatever you choose, you will always get messages from drivers you are talking to and emails about your bookings.</p>`;

export const showEmailPreferences = async (req, res) => {
  const userId = verifyLinkToken(LINK_PURPOSES.EMAIL_PREFERENCES, req.params.token);
  if (!userId) return invalidLink(res);
  try {
    const user = await User.findById(userId).select('emailPreference deletedAt').lean();
    if (!user || user.deletedAt) return invalidLink(res);
    return send(res, 200, 'Your email preferences', preferencesForm(user.emailPreference || EMAIL_PREFERENCES.SUMMARY, false));
  } catch (error) {
    console.error('Show email preferences error:', error);
    return failed(res);
  }
};

export const saveEmailPreferences = async (req, res) => {
  const userId = verifyLinkToken(LINK_PURPOSES.EMAIL_PREFERENCES, req.params.token);
  if (!userId) return invalidLink(res);
  try {
    // A mail client's one-click unsubscribe (RFC 8058) posts
    // "List-Unsubscribe=One-Click" with no choice: stop everything optional.
    const oneClick = req.body?.['List-Unsubscribe'] === 'One-Click';
    const requested = oneClick ? EMAIL_PREFERENCES.ESSENTIAL : req.body?.preference;
    if (!Object.values(EMAIL_PREFERENCES).includes(requested)) {
      return send(res, 400, 'Your email preferences', preferencesForm(EMAIL_PREFERENCES.SUMMARY, false));
    }
    const result = await User.updateOne({ _id: userId, deletedAt: null }, { $set: { emailPreference: requested } });
    if (!result.matchedCount) return invalidLink(res);
    return send(res, 200, 'Your email preferences', preferencesForm(requested, true));
  } catch (error) {
    console.error('Save email preferences error:', error);
    return failed(res);
  }
};

// ---- "What's holding you back?" answers ------------------------------------

const ANSWERS = [
  { value: 'price', label: 'Prices are higher than I expected' },
  { value: 'dates', label: "I haven't fixed my dates" },
  { value: 'choice', label: "I can't choose a driver" },
  { value: 'booked', label: "I've booked something else" },
];

const dashboardLink = () => linkButton('Open my dashboard', buildAppUrl('/dashboard?tab=messages'));

const ANSWER_RESULTS = {
  price: () => ({
    title: 'Thanks for telling us',
    body: `${paragraph('Drivers set their own prices, and they often have room to adjust: fewer kilometres, a different vehicle, or a shorter route can bring the total down. Message a driver with your budget and ask what they can do.')}${dashboardLink()}`,
  }),
  dates: (until) => ({
    title: 'No problem, take your time',
    body: `${paragraph(`We will not send reminders about this request${until ? ` until ${until.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ' for now'}. Your request and its offers stay in your dashboard.`)}${dashboardLink()}`,
  }),
  choice: () => ({
    title: 'We can help you choose',
    body: `${paragraph('Reply to any of our emails about this request, or WhatsApp us on +94 76 3021 483, and our team in Sri Lanka will go through the offers with you.')}${dashboardLink()}`,
  }),
  booked: () => ({
    title: 'Thanks, your request is closed',
    body: paragraph('Drivers will stop sending offers for it and you will not get any more reminders. Have a great trip.'),
  }),
};

export const showQuoteAnswer = async (req, res) => {
  const briefId = verifyLinkToken(LINK_PURPOSES.QUOTE_ANSWER, req.params.token);
  if (!briefId) return invalidLink(res);
  const picked = ANSWERS.some((answer) => answer.value === req.query.reason) ? req.query.reason : '';
  return send(
    res,
    200,
    "What's holding you back?",
    `${paragraph('Your answer helps us send you something useful instead of another reminder.')}
     <form method="post">
       ${ANSWERS.map((answer) => radio('reason', answer.value, answer.label, '', answer.value === picked)).join('')}
       <button type="submit" style="${buttonStyle}margin-top:8px;">Send my answer</button>
     </form>`
  );
};

export const saveQuoteAnswer = async (req, res) => {
  const briefId = verifyLinkToken(LINK_PURPOSES.QUOTE_ANSWER, req.params.token);
  if (!briefId) return invalidLink(res);
  const reason = req.body?.reason;
  if (!ANSWERS.some((answer) => answer.value === reason)) return showQuoteAnswer(req, res);

  try {
    const brief = await TourBrief.findById(briefId).select('status startDate followUp');
    if (!brief) return invalidLink(res);

    const now = new Date();
    brief.set('followUp.feedback', { reason, at: now });
    let pausedUntil = null;

    if (reason === 'booked') {
      // They have a driver from somewhere else: take the request off the board
      // and stop chasing. Only an open request is closed; a booked one is left alone.
      if (brief.status === 'open') brief.status = 'closed';
      brief.set('followUp.optedOutAt', brief.followUp?.optedOutAt || now);
    } else if (reason === 'dates') {
      // Quiet until a month before the trip, when "your trip is in 30 days"
      // becomes useful. If that is already close, a week of quiet instead.
      const monthBefore = new Date(new Date(brief.startDate).getTime() - 30 * DAY);
      pausedUntil = monthBefore > now ? monthBefore : new Date(now.getTime() + 7 * DAY);
      brief.set('followUp.pausedUntil', pausedUntil);
    }
    await brief.save();

    const result = ANSWER_RESULTS[reason](pausedUntil);
    return send(res, 200, result.title, result.body);
  } catch (error) {
    console.error('Save quote answer error:', error);
    return failed(res);
  }
};

// ---- "Post this request again" ---------------------------------------------

export const showQuoteRepost = async (req, res) => {
  const briefId = verifyLinkToken(LINK_PURPOSES.QUOTE_REPOST, req.params.token);
  if (!briefId) return invalidLink(res);
  try {
    const brief = await TourBrief.findById(briefId).select('startLocation endLocation startDate endDate adults children followUp').lean();
    if (!brief) return invalidLink(res);
    if (brief.followUp?.repostedTo) {
      return send(res, 200, 'Already posted again', `${paragraph('This request has already been sent to drivers again. New offers will arrive by email and in your dashboard.')}${linkButton('Open my requests', buildAppUrl('/dashboard?tab=requests'))}`);
    }
    const dates = `${new Date(brief.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(brief.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    return send(
      res,
      200,
      'Post this request again?',
      `${paragraph(`<strong style="color:#0f172a;">${escapeHtml(brief.startLocation)} → ${escapeHtml(brief.endLocation)}</strong><br />${escapeHtml(dates)} · ${brief.adults} adult${brief.adults === 1 ? '' : 's'}${brief.children > 0 ? `, ${brief.children} child${brief.children === 1 ? '' : 'ren'}` : ''}`)}
       ${paragraph('We will send the same request to drivers again so you get up-to-date prices. To change anything first, post a new request from your dashboard instead.')}
       <form method="post"><button type="submit" style="${buttonStyle}">Post it again</button></form>`
    );
  } catch (error) {
    console.error('Show quote repost error:', error);
    return failed(res);
  }
};

const REPOST_PROBLEMS = {
  ALREADY_REPOSTED: 'This request has already been sent to drivers again.',
  PAST_DATES: 'The start date of this request has passed, so it cannot be posted again as it is. Post a new request with your new dates from your dashboard.',
  NOT_OPEN: 'This request already has a booking, so it was not posted again.',
};

export const saveQuoteRepost = async (req, res) => {
  const briefId = verifyLinkToken(LINK_PURPOSES.QUOTE_REPOST, req.params.token);
  if (!briefId) return invalidLink(res);
  try {
    await repostBrief(briefId);
    return send(res, 200, 'Your request is live again', `${paragraph('Drivers are being notified now. We will email you the first offer straight away, then a summary of the rest.')}${linkButton('Open my requests', buildAppUrl('/dashboard?tab=requests'))}`);
  } catch (error) {
    if (error?.code === 'NOT_FOUND') return invalidLink(res);
    if (REPOST_PROBLEMS[error?.code]) {
      return send(res, 200, 'Not posted again', `${paragraph(REPOST_PROBLEMS[error.code])}${linkButton('Open my requests', buildAppUrl('/dashboard?tab=requests'))}`);
    }
    console.error('Save quote repost error:', error);
    return failed(res);
  }
};

export default {
  showEmailPreferences,
  saveEmailPreferences,
  showQuoteAnswer,
  saveQuoteAnswer,
  showQuoteRepost,
  saveQuoteRepost,
};
