import TourBrief from '../models/TourBrief.js';
import User, { EMAIL_PREFERENCES } from '../models/User.js';
import { repostBrief } from './briefController.js';
import { LINK_PURPOSES, verifyLinkToken } from '../utils/signedLinks.js';
import buildAppUrl from '../utils/url.js';
import { EMAIL_LANGUAGES, emailT, intlFor, localizeUrl, normalizeLanguage } from '../i18n/emailI18n.js';

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
const BRAND = '#0fa35a';

// These pages are opened from traveller emails, so they use the traveller's
// saved language (or, before we know who it is, the browser's).
const browserLanguage = (req) => normalizeLanguage(req.acceptsLanguages(...EMAIL_LANGUAGES) || 'en');
// English keeps the day-month-year order these pages always used.
const formatDay = (value, lang) =>
  new Date(value).toLocaleDateString(lang === 'en' ? 'en-GB' : intlFor(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const escapeHtml = (value = '') =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const page = ({ title, body, lang = 'en' }) => `<!doctype html>
<html lang="${lang}">
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

const send = (res, status, title, body, lang = 'en') => {
  res.set('Cache-Control', 'no-store');
  return res.status(status).send(page({ title, body, lang }));
};

const invalidLink = (res, lang = 'en') => {
  const tr = emailT(lang);
  return send(res, 404, tr('pages.invalidTitle'), paragraph(tr('pages.invalidBody')), lang);
};

const failed = (res, lang = 'en') => {
  const tr = emailT(lang);
  return send(res, 500, tr('pages.failedTitle'), paragraph(tr('pages.failedBody')), lang);
};

// ---- Email preferences ("Email me less often") ----------------------------

const PREFERENCE_OPTIONS = [
  { value: EMAIL_PREFERENCES.ALL, key: 'all' },
  { value: EMAIL_PREFERENCES.SUMMARY, key: 'summary' },
  { value: EMAIL_PREFERENCES.ESSENTIAL, key: 'essential' },
];

const preferencesForm = (current, saved, tr) => `
  ${saved ? `<p style="margin:0 0 16px;padding:12px 14px;border-radius:12px;background:#eefaf3;font-size:14px;font-weight:600;color:${BRAND};">${tr('pages.prefs.saved')}</p>` : ''}
  ${paragraph(tr('pages.prefs.intro'))}
  <form method="post">
    ${PREFERENCE_OPTIONS.map((option) =>
      radio('preference', option.value, tr(`pages.prefs.${option.key}`), tr(`pages.prefs.${option.key}Hint`), option.value === current)
    ).join('')}
    <button type="submit" style="${buttonStyle}margin-top:8px;">${tr('pages.prefs.save')}</button>
  </form>
  <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64748b;">${tr('pages.prefs.always')}</p>`;

export const showEmailPreferences = async (req, res) => {
  const fallback = browserLanguage(req);
  const userId = verifyLinkToken(LINK_PURPOSES.EMAIL_PREFERENCES, req.params.token);
  if (!userId) return invalidLink(res, fallback);
  try {
    const user = await User.findById(userId).select('emailPreference deletedAt language').lean();
    if (!user || user.deletedAt) return invalidLink(res, fallback);
    const lang = normalizeLanguage(user.language);
    const tr = emailT(lang);
    return send(res, 200, tr('pages.prefs.title'), preferencesForm(user.emailPreference || EMAIL_PREFERENCES.SUMMARY, false, tr), lang);
  } catch (error) {
    console.error('Show email preferences error:', error);
    return failed(res, fallback);
  }
};

export const saveEmailPreferences = async (req, res) => {
  const fallback = browserLanguage(req);
  const userId = verifyLinkToken(LINK_PURPOSES.EMAIL_PREFERENCES, req.params.token);
  if (!userId) return invalidLink(res, fallback);
  try {
    const owner = await User.findById(userId).select('language').lean();
    const lang = owner ? normalizeLanguage(owner.language) : fallback;
    const tr = emailT(lang);
    // A mail client's one-click unsubscribe (RFC 8058) posts
    // "List-Unsubscribe=One-Click" with no choice: stop everything optional.
    const oneClick = req.body?.['List-Unsubscribe'] === 'One-Click';
    const requested = oneClick ? EMAIL_PREFERENCES.ESSENTIAL : req.body?.preference;
    if (!Object.values(EMAIL_PREFERENCES).includes(requested)) {
      return send(res, 400, tr('pages.prefs.title'), preferencesForm(EMAIL_PREFERENCES.SUMMARY, false, tr), lang);
    }
    const result = await User.updateOne({ _id: userId, deletedAt: null }, { $set: { emailPreference: requested } });
    if (!result.matchedCount) return invalidLink(res, lang);
    return send(res, 200, tr('pages.prefs.title'), preferencesForm(requested, true, tr), lang);
  } catch (error) {
    console.error('Save email preferences error:', error);
    return failed(res, fallback);
  }
};

// ---- "What's holding you back?" answers ------------------------------------

// The answer labels are the same as the buttons in the email (digest.why.*).
const ANSWERS = ['price', 'dates', 'choice', 'booked'];

const dashboardLink = (tr, lang) =>
  linkButton(tr('pages.answer.openDashboard'), localizeUrl(buildAppUrl('/dashboard?tab=messages'), lang));

const ANSWER_RESULTS = {
  price: (until, tr, lang) => ({
    title: tr('pages.answer.priceTitle'),
    body: `${paragraph(tr('pages.answer.priceBody'))}${dashboardLink(tr, lang)}`,
  }),
  dates: (until, tr, lang) => ({
    title: tr('pages.answer.datesTitle'),
    body: `${paragraph(until ? tr('pages.answer.datesUntil', { date: formatDay(until, lang) }) : tr('pages.answer.datesForNow'))}${dashboardLink(tr, lang)}`,
  }),
  choice: (until, tr, lang) => ({
    title: tr('pages.answer.choiceTitle'),
    body: `${paragraph(tr('pages.answer.choiceBody'))}${dashboardLink(tr, lang)}`,
  }),
  booked: (until, tr) => ({
    title: tr('pages.answer.bookedTitle'),
    body: paragraph(tr('pages.answer.bookedBody')),
  }),
};

const briefLanguage = async (briefId, req) => {
  try {
    const brief = await TourBrief.findById(briefId).select('language').lean();
    return brief?.language ? normalizeLanguage(brief.language) : browserLanguage(req);
  } catch {
    return browserLanguage(req);
  }
};

export const showQuoteAnswer = async (req, res) => {
  const briefId = verifyLinkToken(LINK_PURPOSES.QUOTE_ANSWER, req.params.token);
  if (!briefId) return invalidLink(res, browserLanguage(req));
  const lang = await briefLanguage(briefId, req);
  const tr = emailT(lang);
  const picked = ANSWERS.includes(req.query.reason) ? req.query.reason : '';
  return send(
    res,
    200,
    tr('pages.answer.title'),
    `${paragraph(tr('pages.answer.intro'))}
     <form method="post">
       ${ANSWERS.map((answer) => radio('reason', answer, tr(`digest.why.${answer}`), '', answer === picked)).join('')}
       <button type="submit" style="${buttonStyle}margin-top:8px;">${tr('pages.answer.send')}</button>
     </form>`,
    lang
  );
};

export const saveQuoteAnswer = async (req, res) => {
  const briefId = verifyLinkToken(LINK_PURPOSES.QUOTE_ANSWER, req.params.token);
  if (!briefId) return invalidLink(res, browserLanguage(req));
  const reason = req.body?.reason;
  if (!ANSWERS.includes(reason)) return showQuoteAnswer(req, res);

  let lang = browserLanguage(req);
  try {
    const brief = await TourBrief.findById(briefId).select('status startDate followUp language');
    if (!brief) return invalidLink(res, lang);
    if (brief.language) lang = normalizeLanguage(brief.language);
    const tr = emailT(lang);

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

    const result = ANSWER_RESULTS[reason](pausedUntil, tr, lang);
    return send(res, 200, result.title, result.body, lang);
  } catch (error) {
    console.error('Save quote answer error:', error);
    return failed(res, lang);
  }
};

// ---- "Post this request again" ---------------------------------------------

export const showQuoteRepost = async (req, res) => {
  const fallback = browserLanguage(req);
  const briefId = verifyLinkToken(LINK_PURPOSES.QUOTE_REPOST, req.params.token);
  if (!briefId) return invalidLink(res, fallback);
  try {
    const brief = await TourBrief.findById(briefId).select('startLocation endLocation startDate endDate adults children followUp language').lean();
    if (!brief) return invalidLink(res, fallback);
    const lang = brief.language ? normalizeLanguage(brief.language) : fallback;
    const tr = emailT(lang);
    const requestsLink = linkButton(tr('pages.repost.openRequests'), localizeUrl(buildAppUrl('/dashboard?tab=requests'), lang));
    if (brief.followUp?.repostedTo) {
      return send(res, 200, tr('pages.repost.alreadyTitle'), `${paragraph(tr('pages.repost.alreadyBody'))}${requestsLink}`, lang);
    }
    const dates = `${formatDay(brief.startDate, lang)} – ${formatDay(brief.endDate, lang)}`;
    const people = `${tr('pages.repost.adults', { count: brief.adults })}${brief.children > 0 ? `, ${tr('pages.repost.children', { count: brief.children })}` : ''}`;
    return send(
      res,
      200,
      tr('pages.repost.title'),
      `${paragraph(`<strong style="color:#0f172a;">${escapeHtml(brief.startLocation)} → ${escapeHtml(brief.endLocation)}</strong><br />${escapeHtml(dates)} · ${people}`)}
       ${paragraph(tr('pages.repost.body'))}
       <form method="post"><button type="submit" style="${buttonStyle}">${tr('pages.repost.button')}</button></form>`,
      lang
    );
  } catch (error) {
    console.error('Show quote repost error:', error);
    return failed(res, fallback);
  }
};

const REPOST_PROBLEMS = {
  ALREADY_REPOSTED: 'pages.repost.problemAlready',
  PAST_DATES: 'pages.repost.problemPast',
  NOT_OPEN: 'pages.repost.problemNotOpen',
};

export const saveQuoteRepost = async (req, res) => {
  const briefId = verifyLinkToken(LINK_PURPOSES.QUOTE_REPOST, req.params.token);
  if (!briefId) return invalidLink(res, browserLanguage(req));
  const lang = await briefLanguage(briefId, req);
  const tr = emailT(lang);
  const requestsLink = () => linkButton(tr('pages.repost.openRequests'), localizeUrl(buildAppUrl('/dashboard?tab=requests'), lang));
  try {
    await repostBrief(briefId);
    return send(res, 200, tr('pages.repost.liveTitle'), `${paragraph(tr('pages.repost.liveBody'))}${requestsLink()}`, lang);
  } catch (error) {
    if (error?.code === 'NOT_FOUND') return invalidLink(res, lang);
    if (REPOST_PROBLEMS[error?.code]) {
      return send(res, 200, tr('pages.repost.notTitle'), `${paragraph(tr(REPOST_PROBLEMS[error.code]))}${requestsLink()}`, lang);
    }
    console.error('Save quote repost error:', error);
    return failed(res, lang);
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
