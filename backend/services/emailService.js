import Brevo from 'sib-api-v3-sdk';
import { OFFER_INCLUSION_KEYS } from '../utils/offerInclusions.js';
import User from '../models/User.js';
import { emailT, intlFor, localizeUrl, normalizeLanguage } from '../i18n/emailI18n.js';

const EN = emailT('en');

// The language a traveller's emails are written in: their saved website
// language. Drivers and admins always get English. Looked up by email when the
// caller passed a person without the field.
const languageOf = async (person) => {
  if (!person || person.role === 'driver' || person.role === 'admin') return 'en';
  if (person.language !== undefined) return normalizeLanguage(person.language);
  if (!person.email) return 'en';
  try {
    const user = await User.findOne({ email: String(person.email).toLowerCase() }).select('language role').lean();
    return user && user.role !== 'driver' && user.role !== 'admin' ? normalizeLanguage(user.language) : 'en';
  } catch {
    return 'en';
  }
};

let brevoClient;

const getBrandName = () => process.env.APP_BRAND_NAME || 'Car With Driver';
const getAppBaseUrl = () => process.env.APP_BASE_URL || 'http://carwithdriver.lk';
const getEmailFrom = () => process.env.EMAIL_FROM || 'hello@carwithdriver.lk';
const getBrevoApiKey = () => process.env.BREVO_API_KEY || '';
const getSupportEmail = () => process.env.SUPPORT_EMAIL || getEmailFrom() || 'support@carwithdriver.lk';
const getCurrencyCode = () => process.env.APP_CURRENCY || 'USD';

/** Where a traveller's reply to a "need help choosing?" email should land: our own inbox. */
export const getSupportReplyAddress = () => {
  const match = getSupportEmail().match(/[^\s<>"]+@[^\s<>"]+/);
  return match ? match[0] : '';
};

// Set inline on every text element, links included: many mail clients do not
// pass a font down from a parent, and an unstyled button label falls back to
// Times New Roman.
const fontStack = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
// The site's brand green. White text on it is about 3.3:1, so it is used for
// buttons and bold labels (large, heavy text), never for small body copy.
const brandColor = '#0fa35a';

const paragraphStyles = `margin:0 0 14px 0;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};`;
// Mid grey: reads as secondary but stays legible on a phone outdoors.
const footerStyles = `margin:0 0 6px 0;color:#64748b;font-size:13px;line-height:1.6;font-family:${fontStack};`;

// Mail providers (Gmail above all) fetch an image once and then serve their own
// cached copy for that URL, so a logo can never be changed in place: a new
// design needs a new file name. /email-logo.png is the original white-lettered
// logo and must stay as it is, because emails already sent with the green
// header still point at it.
const getLogoUrl = () => process.env.EMAIL_LOGO_URL || buildUrl('/email-logo-light.png');
const getWhatsAppNumber = () => process.env.SUPPORT_WHATSAPP || '+94 76 3021 483';

// `replyable`: true when a reply is posted into the driver chat, 'support' when
// it reaches our own inbox, false for send-only emails.
const getDefaultFooterLines = ({ replyable = false, preferencesUrl = '', tr = EN } = {}) => {
  const whatsApp = getWhatsAppNumber();
  const whatsAppLink = `<a href="https://wa.me/${whatsApp.replace(/\D/g, '')}" style="color:#64748b;font-family:${fontStack};">${whatsApp}</a>`;
  return [
    replyable === 'support'
      ? tr('footer.support')
      : replyable
        ? tr('footer.replyable')
        : tr('footer.noReply'),
    tr('footer.questions', { whatsapp: whatsAppLink, email: getSupportEmail() }),
    preferencesUrl
      ? tr('footer.lessOften').replace(
          /<link>(.*?)<\/link>/,
          `<a href="${preferencesUrl}" style="color:#64748b;font-family:${fontStack};">$1</a>`
        )
      : null,
    tr('footer.reason', { brand: getBrandName() }),
    `© ${new Date().getFullYear()} ${getBrandName()}`,
  ];
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatMultiline = (value = '') => escapeHtml(value).replace(/\n/g, '<br />');

const htmlToText = (html = '') =>
  html
    .replace(/<\/(p|div|br|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{2,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();

const formatStatus = (status, tr = null) => {
  if (!status) {
    return '';
  }
  if (tr) {
    const key = `common.status.${status}`;
    const label = tr(key);
    if (label !== key) return label;
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const buildUrl = (pathname = '/') => {
  const appBaseUrl = getAppBaseUrl();
  try {
    return new URL(pathname, appBaseUrl).toString();
  } catch {
    const normalizedBase = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${normalizedBase}${normalizedPath}`;
  }
};

const formatDate = (value, lang = 'en') => {
  if (!value) {
    return emailT(lang)('common.tbd');
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return emailT(lang)('common.tbd');
  }
  return date.toLocaleDateString(intlFor(lang), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateRange = (start, end, lang = 'en') => {
  if (!start || !end) {
    return emailT(lang)('common.tbd');
  }
  return emailT(lang)('common.dateRange', { start: formatDate(start, lang), end: formatDate(end, lang) });
};

const formatCurrency = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 'TBD';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: getCurrencyCode(),
  }).format(numericValue);
};

const renderParagraphs = (lines = []) =>
  lines
    .filter(Boolean)
    .map((line) => {
      if (typeof line === 'string') {
        return `<p style="${paragraphStyles}">${line}</p>`;
      }
      if (typeof line === 'object' && typeof line.raw === 'string') {
        return line.raw;
      }
      return '';
    })
    .join('');

const renderFooter = (lines = []) =>
  lines
    .filter(Boolean)
    .map((line) => `<p style="${footerStyles}">${line}</p>`)
    .join('');

const parseFromAddress = (value = '') => {
  const trimmed = value?.trim?.() || '';
  const brandName = getBrandName();

  if (!trimmed) {
    return { email: 'hello@carwithdriver.lk', name: brandName };
  }

  const match = trimmed.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, '');
    const email = match[2].trim();
    return { email, name: name || brandName };
  }

  return { email: trimmed, name: brandName };
};

const renderButton = ({ label, url }) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td align="center" bgcolor="${brandColor}" style="border-radius:12px;">
        <a href="${url}" style="display:inline-block;padding:14px 26px;font-family:${fontStack};font-size:16px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:12px;">${label}</a>
      </td>
    </tr>
  </table>`;

// Table layout with inline styles throughout: Outlook ignores <style> blocks
// and flexbox. The preheader is the inbox preview line and must stay hidden in
// the email itself. The logo file has its own white background baked in (no
// transparency), so its dark lettering stays readable when a mail client
// darkens the header in dark mode.
const buildEmailTemplate = ({
  title,
  preheader,
  bodyLines = [],
  action,
  footerLines = [],
  replyable = false,
  preferencesUrl = '',
  lang = 'en',
}) => `
  ${
    preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">${preheader}</div>`
      : ''
  }
  <div style="background-color:#eef2f1;padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;">
            <tr>
              <td bgcolor="#ffffff" style="padding:18px 28px 14px 28px;border-bottom:1px solid #e2e8f0;">
                <img src="${getLogoUrl()}" alt="${escapeHtml(getBrandName())}" height="44" style="display:block;border:0;outline:none;height:44px;width:auto;font-family:${fontStack};font-size:18px;font-weight:700;color:#0f172a;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;font-family:${fontStack};">
                  ${title}
                </h1>
                ${renderParagraphs(bodyLines)}
                ${action ? renderButton(action) : ''}
                ${renderFooter([...footerLines, ...getDefaultFooterLines({ replyable, preferencesUrl, tr: emailT(lang) })])}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

const initBrevoClient = () => {
  if (brevoClient) {
    return brevoClient;
  }

  const brevoApiKey = getBrevoApiKey();
  if (!brevoApiKey) {
    return null;
  }

  const apiClient = Brevo.ApiClient.instance;
  apiClient.authentications['api-key'].apiKey = brevoApiKey;
  brevoClient = new Brevo.TransactionalEmailsApi();
  return brevoClient;
};

const normalizeRecipients = (to) => {
  const recipients = Array.isArray(to) ? to : [to];
  return recipients
    .map((recipient) => {
      if (!recipient) {
        return null;
      }
      if (typeof recipient === 'string') {
        return recipient.trim();
      }
      if (typeof recipient?.email === 'string') {
        return recipient.email.trim();
      }
      return null;
    })
    .filter(Boolean);
};

const logEmailPreview = ({ to, subject, html }, reason) => {
  const preview = htmlToText(html).slice(0, 400);
  const message = reason || 'Unable to send email via Brevo.';
  console.warn(`[email] ${message}`);
  console.info(JSON.stringify({ to, subject, preview }, null, 2));
};

const logEmailResult = ({ to, subject }, status, extra = {}) => {
  const entry = { to, subject, ...extra };
  const serialized = JSON.stringify(entry, null, 2);
  if (status === 'SENT') {
    console.info(`[email] SENT\n${serialized}`);
  } else {
    console.warn(`[email] ${status}\n${serialized}`);
  }
};

// `senderName` replaces the display name only (the address never changes);
// `tags` label the email type so Brevo's statistics can be split by type.
const sendEmail = async ({ to, subject, html, text, replyTo, headers, senderName, tags }) => {
  const recipients = normalizeRecipients(to);

  if (!recipients.length) {
    return;
  }

  const payload = {
    to: recipients,
    subject,
    html,
    text: text || htmlToText(html),
  };

  const client = initBrevoClient();

  if (!client) {
    logEmailResult(payload, 'SKIPPED', { reason: 'BREVO_API_KEY missing' });
    logEmailPreview(payload, 'BREVO_API_KEY missing. Logging the email preview instead.');
    return;
  }

  try {
    const { email, name } = parseFromAddress(getEmailFrom());

    const response = await client.sendTransacEmail({
      sender: { email, name: senderName || name || getBrandName() },
      to: payload.to.map((address) => ({ email: address })),
      ...(replyTo ? { replyTo: { email: replyTo, name: name || getBrandName() } } : {}),
      ...(headers ? { headers } : {}),
      ...(Array.isArray(tags) && tags.length > 0 ? { tags } : {}),
      subject: payload.subject,
      htmlContent: payload.html,
      textContent: payload.text,
    });

    logEmailResult(payload, 'SENT', {
      provider: 'Brevo',
      messageId: response?.messageId || response?.message_id,
    });
  } catch (error) {
    const status = error?.response?.status || error?.status || error?.statusCode;
    const errorBody =
      typeof error?.response?.body === 'object'
        ? JSON.stringify(error.response.body, null, 2)
        : error?.response?.body;
    const errorMessage =
      error?.response?.body?.message ||
      errorBody ||
      error?.message ||
      error?.toString?.() ||
      'Unknown error';

    console.error('[email] Brevo API error:', errorMessage);
    if (errorBody) {
      console.error('[email] Brevo response body:', errorBody);
    }
    logEmailResult(payload, 'FAILED', { error: errorMessage, status, body: errorBody });
    logEmailPreview(payload, 'Brevo send failed. Logged preview for debugging.');
  }
};

export const sendDriverAdminMessageEmail = async ({ driver, subject, message, sender }) => {
  if (!driver?.email || !message) {
    return;
  }

  const safeDriverName = escapeHtml(driver.name || 'there');
  const adminName = escapeHtml(sender?.name || 'Admin team');
  const adminEmail = sender?.email ? ` (${escapeHtml(sender.email)})` : '';
  const brandName = getBrandName();
  const normalizedSubject = subject?.trim() || `Message from ${brandName}`;
  const normalizedMessage = message.trim();

  const html = buildEmailTemplate({
    title: normalizedSubject,
    preheader: `${adminName} sent you a new message on ${brandName}`,
    bodyLines: [
      `Hi ${safeDriverName},`,
      formatMultiline(normalizedMessage),
      `— ${adminName}${adminEmail}`,
    ],
    action: {
      label: 'Open driver portal',
      url: buildUrl('/portal/driver'),
    },
    footerLines: sender?.email ? [`Questions? Reply to ${escapeHtml(sender.email)}.`] : [],
  });

  const text = `Hi ${driver.name || 'there'},\n\n${normalizedMessage}\n\n— ${
    sender?.name || 'Admin team'
  }${sender?.email ? ` (${sender.email})` : ''}`;

  await sendEmail({
    to: driver.email,
    subject: normalizedSubject,
    html,
    text,
  });
};

export const sendSupportRequestEmail = async ({ name, email, category, bookingId, message }) => {
  const targetEmail = getSupportEmail() || 'hello@carwithdriver.lk';
  const extraRecipient = 'janindu883@gmail.com';
  const safeName = escapeHtml(name || 'Customer');
  const safeEmail = escapeHtml(email || 'unknown');
  const normalizedCategory = category ? escapeHtml(category) : 'Not specified';
  const normalizedBookingId = bookingId ? escapeHtml(bookingId) : 'Not provided';
  const html = buildEmailTemplate({
    title: 'New support request',
    preheader: `${safeName} requested help via the contact page.`,
    bodyLines: [
      `<strong>Name:</strong> ${safeName}`,
      `<strong>Email:</strong> ${safeEmail}`,
      `<strong>Category:</strong> ${normalizedCategory}`,
      `<strong>Booking ID:</strong> ${normalizedBookingId}`,
      {
        raw: `<p style="${paragraphStyles}"><strong>Message:</strong><br />${formatMultiline(message || '')}</p>`,
      },
    ],
    action: {
      label: 'Reply now',
      url: `mailto:${safeEmail}`,
    },
  });

  const text = `New support request\n\nName: ${name || 'Customer'}\nEmail: ${
    email || 'unknown'
  }\nCategory: ${category || 'Not specified'}\nBooking ID: ${
    bookingId || 'Not provided'
  }\n\n${message || ''}`;

  await sendEmail({
    to: [targetEmail, extraRecipient],
    subject: `Support request from ${name || 'customer'}`,
    html,
    text,
  });
};

export const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const safeName = escapeHtml(name || 'there');
  const url = verificationUrl || buildUrl('/verify-email');
  const brandName = getBrandName();
  const html = buildEmailTemplate({
    title: 'Verify your email address',
    preheader: `Confirm your email to activate your ${brandName} account`,
    bodyLines: [
      `Hi ${safeName},`,
      `Thanks for registering with ${brandName}. Please confirm your email address to activate your account.`,
      'For security reasons this link expires in 24 hours.',
      {
        raw: `<p style="${paragraphStyles}"><strong>Verification link:</strong> <a href="${url}" style="font-family:${fontStack};color:${brandColor};word-break:break-all;">${url}</a></p>`,
      },
    ],
    action: {
      label: 'Verify email',
      url,
    },
  });

  const text = `Hi ${name || 'there'},\n\nThanks for registering with ${brandName}. Confirm your email by visiting: ${url}\n\nThis link expires in 24 hours.`;

  await sendEmail({
    to,
    subject: `Verify your ${brandName} account`,
    html,
    text,
  });
};

export const sendPasswordResetEmail = async ({ to, name, resetUrl, expiresInMinutes = 60 }) => {
  const safeName = escapeHtml(name || 'there');
  const url = resetUrl || buildUrl('/reset-password');
  const brandName = getBrandName();
  const html = buildEmailTemplate({
    title: 'Reset your password',
    preheader: `Use this link to reset your ${brandName} password`,
    bodyLines: [
      `Hi ${safeName},`,
      `We received a request to reset the password for your ${brandName} account.`,
      `Use the button below to choose a new password. The link stays active for ${expiresInMinutes} minutes.`,
      'If you did not request this, you can safely ignore the email.',
    ],
    action: {
      label: 'Choose a new password',
      url,
    },
  });

  const text = `Hi ${name || 'there'},\n\nReset your ${brandName} password using this link (valid for ${expiresInMinutes} minutes): ${url}\n\nIf you did not request this, you can ignore the message.`;

  await sendEmail({
    to,
    subject: `Reset your ${brandName} password`,
    html,
    text,
  });
};

export const sendPasswordChangedEmail = async ({ to, name }) => {
  const safeName = escapeHtml(name || 'there');
  const brandName = getBrandName();
  const html = buildEmailTemplate({
    title: 'Your password was updated',
    preheader: `Confirmation of your recent ${brandName} password change`,
    bodyLines: [
      `Hi ${safeName},`,
      'This is a confirmation that your password was updated successfully.',
      'If you did not make this change, reset your password immediately or contact support.',
    ],
    action: {
      label: 'Review account security',
      url: buildUrl('/login'),
    },
  });

  const text = `Hi ${name || 'there'},\n\nYour ${brandName} password was just changed. If this was not you, reset it immediately or contact support.`;

  await sendEmail({
    to,
    subject: `${brandName} password updated`,
    html,
    text,
  });
};

/**
 * A chat notification: a driver's message (or several sent close together,
 * passed as `messages`) or an offer sent directly in a chat.
 *
 * These are service emails. A traveller needs to know a driver they are talking
 * to has written, so they are sent whatever the traveller's email preference is.
 */
export const sendConversationNotificationEmail = async ({
  recipient,
  sender,
  messagePreview,
  messages,
  conversationUrl,
  isOffer = false,
  offerPrice,
  vehicleModel,
  replyTo,
}) => {
  if (!recipient?.email) {
    return;
  }

  const forTraveller = recipient.role !== 'driver';
  // Drivers always get English; travellers get their website language.
  const lang = forTraveller ? await languageOf(recipient) : 'en';
  const tr = emailT(lang);
  const plainSender = sender?.name || tr('message.yourContact');
  const senderName = escapeHtml(plainSender);
  const bodies = (Array.isArray(messages) && messages.length > 0 ? messages : [messagePreview]).filter(Boolean);
  const brandName = getBrandName();
  const price = Number.isFinite(Number(offerPrice)) && offerPrice !== null && offerPrice !== undefined ? formatWholeCurrency(offerPrice) : '';

  // The start of the message in the subject shows a real question is waiting.
  const firstLine = (bodies[0] || '').replace(/\s+/g, ' ').trim();
  const snippet = firstLine.length > 50 ? `${firstLine.slice(0, 50).trimEnd()}…` : firstLine;
  const subject = isOffer
    ? price
      ? tr('message.subjectOfferPrice', { sender: plainSender, price })
      : tr('message.subjectOffer', { sender: plainSender })
    : snippet
      ? tr('message.subjectSnippet', { sender: plainSender, snippet })
      : tr('message.subjectMessage', { sender: plainSender });

  const action = isOffer
    ? tr('message.sentOffer')
    : bodies.length > 1
      ? tr('message.sentMany', { count: bodies.length })
      : tr('message.sentOne');
  const conversationLink = forTraveller ? localizeUrl(conversationUrl, lang) : conversationUrl;

  const quoteStyle = `margin:0 0 12px 0;padding:12px 16px;border-left:4px solid ${brandColor};background:#f1f5f9;border-radius:12px;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};`;
  const lines = [
    greeting(tr, recipient.name),
    tr('message.on', {
      sender: senderName,
      action,
      about: vehicleModel ? tr('message.about', { model: escapeHtml(vehicleModel) }) : '',
      brand: brandName,
    }),
    ...bodies.map((body) => ({ raw: `<blockquote style="${quoteStyle}">${formatMultiline(body)}</blockquote>` })),
    replyTo ? tr('message.replyDirect', { sender: senderName }) : tr('message.replyDashboard'),
    isOffer && forTraveller ? renderReassurance(tr) : null,
  ];

  const html = buildEmailTemplate({
    lang,
    title: isOffer ? tr('message.titleOffer') : bodies.length > 1 ? tr('message.titleMany') : tr('message.titleOne'),
    preheader: replyTo
      ? tr('message.preheaderReply', { sender: senderName })
      : isOffer
        ? tr('message.preheaderOffer', { sender: senderName, brand: brandName })
        : tr('message.preheaderMessage', { sender: senderName, brand: brandName }),
    bodyLines: lines,
    action: {
      label: isOffer ? tr('message.actionOffer') : tr('message.actionReply'),
      url: conversationLink || (recipient?.role === 'driver' ? buildUrl('/portal/driver/messages') : localizeUrl(buildUrl('/dashboard'), lang)),
    },
    replyable: Boolean(replyTo),
  });

  const text = forTraveller
    ? `${greeting(tr, recipient.name, { html: false })}\n\n${tr('message.textBody', {
        sender: plainSender,
        action: isOffer ? tr('message.sentOffer') : tr('message.sentOne'),
      })}\n\n${bodies.join('\n\n')}\n\n${replyTo ? tr('message.textReplyOrOpen') : tr('message.textOpen')}`
    : `Hi ${recipient.name || 'there'},\n\n${plainSender} ${
        isOffer ? 'sent you a trip offer' : 'sent you a new message'
      }.\n\n${bodies.join('\n\n')}\n\n${replyTo ? 'Reply to this email, or open' : 'Open'} your driver portal to reply.`;

  await sendEmail({
    to: recipient.email,
    subject,
    html,
    text,
    replyTo,
    // A named person gets more attention than a system alert; the address is unchanged.
    senderName: forTraveller ? tr('message.senderVia', { sender: plainSender, brand: brandName }) : undefined,
    tags: forTraveller ? [isOffer ? EMAIL_TAGS.OFFER : EMAIL_TAGS.MESSAGE] : undefined,
  });
};

// How many transactional emails the provider will still accept today, or null
// when that cannot be determined (no API key, a plan without a send limit, or
// the lookup failing). The free plan silently drops everything past its daily
// limit while still answering "accepted", so optional emails check this first
// and leave the remaining sends for verification, offer and booking emails.
let creditsCache = { value: null, fetchedAt: 0 };
const CREDITS_CACHE_MS = 10 * 60 * 1000;

export const getRemainingEmailCredits = async ({ fresh = false } = {}) => {
  if (!fresh && Date.now() - creditsCache.fetchedAt < CREDITS_CACHE_MS) {
    return creditsCache.value;
  }
  let value = null;
  try {
    if (initBrevoClient()) {
      const account = await new Brevo.AccountApi().getAccount();
      const plans = Array.isArray(account?.plan) ? account.plan : [];
      const limited = plans.find((plan) => plan?.creditsType === 'sendLimit' && Number.isFinite(plan?.credits));
      value = limited ? limited.credits : null;
    }
  } catch (error) {
    console.warn('[email] Could not read remaining credits:', error?.message || error);
  }
  creditsCache = { value, fetchedAt: Date.now() };
  return value;
};

// ---------------------------------------------------------------------------
// Traveller offer emails: the first offer, the summaries that replace one email
// per later offer, and the reminders. Wording and schedule are documented in
// TRAVELLER_EMAILS.md at the repo root.
// ---------------------------------------------------------------------------

const cellStyles = `font-family:${fontStack};font-size:14px;line-height:1.55;color:#0f172a;`;

// Email type labels for Brevo's per-tag statistics (clicks by email type).
export const EMAIL_TAGS = {
  REQUEST_RECEIVED: 'traveller-request-received',
  FIRST_OFFER: 'traveller-first-offer',
  OFFER: 'traveller-offer',
  MESSAGE: 'traveller-message',
  DIGEST: 'traveller-offers-digest',
  UPDATE: 'traveller-offers-update',
  STILL_DECIDING: 'traveller-still-deciding',
  APPROACHING: 'traveller-trip-approaching',
  EXPIRING: 'traveller-offers-expiring',
  EXPIRED: 'traveller-offers-expired',
  NO_OFFERS: 'traveller-no-offers',
  OFFER_REMINDER: 'traveller-offer-reminder',
  BOOKING: 'traveller-booking',
  PRE_TRIP: 'traveller-pre-trip',
};

const formatWholeCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: getCurrencyCode(), maximumFractionDigits: 0 }).format(numeric);
};

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const briefRouteLabel = (brief, tr = EN) =>
  [brief?.startLocation, brief?.endLocation].filter(Boolean).join(' → ') || tr('common.yourTrip');

// The promises the site makes on its pricing and cancellation pages. Kept in
// one place (reassurance.* in the email texts) so every offer email says the same thing.
const renderReassurance = (tr = EN) => ({
  raw: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
    <tr>
      <td bgcolor="#eefaf3" style="padding:14px 16px;border-radius:12px;${cellStyles}">
        <strong style="font-family:${fontStack};">${tr('reassurance.title')}</strong> ${tr('reassurance.points').join(' &middot; ')}. ${tr('reassurance.locked')}
      </td>
    </tr>
  </table>`,
});

const renderStars = (rating) => {
  const full = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return `<span style="color:#f59e0b;">${'&#9733;'.repeat(full)}</span><span style="color:#cbd5e1;">${'&#9733;'.repeat(5 - full)}</span>`;
};

const describeDriverFacts = (offer, tr = EN) =>
  [
    offer.reviewCount > 0
      ? `${renderStars(offer.rating)} ${Number(offer.rating).toFixed(1)} &middot; ${tr('common.reviews', { count: offer.reviewCount })}`
      : tr('card.newOnPlatform'),
    offer.experienceYears > 0 ? tr('card.experience', { count: offer.experienceYears }) : null,
  ]
    .filter(Boolean)
    .join(' &middot; ');

const renderOfferInclusions = (inclusions, tr = EN) => {
  // Offers sent before inclusions existed carry no list; showing six crosses
  // for those would wrongly read as "nothing included".
  if (!Array.isArray(inclusions)) return '';
  const cell = (key) => {
    const included = inclusions.includes(key);
    // Grey cross, not red: in an email red reads as a warning about the offer.
    return `<td width="50%" valign="top" style="padding:2px 6px 2px 0;font-family:${fontStack};font-size:13px;line-height:1.45;color:${included ? '#0f172a' : '#94a3b8'};">
      <span style="color:${included ? '#059669' : '#94a3b8'};font-weight:800;">${included ? '&#10003;' : '&#10005;'}</span>
      ${escapeHtml(tr(`card.inclusions.${key}`))}
    </td>`;
  };
  const rows = [];
  for (let index = 0; index < OFFER_INCLUSION_KEYS.length; index += 2) {
    rows.push(`<tr>${cell(OFFER_INCLUSION_KEYS[index])}${OFFER_INCLUSION_KEYS[index + 1] ? cell(OFFER_INCLUSION_KEYS[index + 1]) : '<td></td>'}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">${rows.join('')}</table>`;
};

// Pick labels ("Best value", …) are set in English by quoteFollowUpService.
const offerLabel = (label, tr = EN) => {
  if (!label) return '';
  const key = `card.labels.${label}`;
  const value = tr(key);
  return value === key ? label : value;
};

/**
 * One offer as a card. Offer shape (built in services/quoteFollowUpService.js):
 * { driverName, driverPhoto, rating, reviewCount, experienceYears, vehicleModel,
 *   vehicleSeats, totalKms, pricePerExtraKm, totalPrice, days, inclusions,
 *   note, viewUrl, label }
 * `expired` greys the card and drops its link.
 */
const renderOfferCard = (offer, { expired = false, button = true, tr = EN, lang = 'en' } = {}) => {
  const vehicle = [
    offer.vehicleModel ? escapeHtml(offer.vehicleModel) : null,
    offer.vehicleSeats ? tr('card.seats', { count: offer.vehicleSeats }) : null,
  ].filter(Boolean).join(', ');
  const perDay = offer.days > 0 && Number.isFinite(offer.totalPrice) ? formatWholeCurrency(offer.totalPrice / offer.days) : '';
  const distance = Number.isFinite(offer.totalKms)
    ? Number.isFinite(offer.pricePerExtraKm)
      ? tr('card.kmsThen', { km: offer.totalKms, rate: `$${Number(offer.pricePerExtraKm).toFixed(2)}` })
      : tr('card.kms', { km: offer.totalKms })
    : '';
  const initial = escapeHtml((offer.driverName || 'D').trim().charAt(0).toUpperCase());
  const photo = offer.driverPhoto
    ? `<img src="${offer.driverPhoto}" alt="" width="52" height="52" style="display:block;border:0;width:52px;height:52px;border-radius:26px;" />`
    : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="52" height="52" align="center" bgcolor="#e2e8f0" style="border-radius:26px;font-family:${fontStack};font-size:20px;font-weight:700;color:#475569;">${initial}</td></tr></table>`;
  const label = offerLabel(offer.label, tr);
  const viewUrl = localizeUrl(offer.viewUrl, lang);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px 0;border:1px solid #e2e8f0;border-radius:14px;">
    <tr>
      <td style="padding:16px;${expired ? 'opacity:0.7;' : ''}">
        ${
          label
            ? `<div style="margin:0 0 10px 0;font-family:${fontStack};font-size:11px;font-weight:800;letter-spacing:0.08em;color:${brandColor};">${escapeHtml(label.toUpperCase())}</div>`
            : ''
        }
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="64" valign="top">${photo}</td>
            <td valign="top" style="${cellStyles}">
              <div style="font-family:${fontStack};font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(offer.driverName || tr('common.driver'))}</div>
              <div style="font-family:${fontStack};font-size:13px;color:#475569;">${describeDriverFacts(offer, tr)}</div>
              ${vehicle ? `<div style="font-family:${fontStack};font-size:13px;color:#475569;">${vehicle}</div>` : ''}
            </td>
          </tr>
        </table>
        <div style="margin-top:12px;font-family:${fontStack};">
          <span style="font-family:${fontStack};font-size:22px;font-weight:800;color:${expired ? '#94a3b8' : '#0f172a'};${expired ? 'text-decoration:line-through;' : ''}">${formatWholeCurrency(offer.totalPrice)}</span>
          <span style="font-family:${fontStack};font-size:13px;color:#475569;">${tr('card.total')}${perDay ? ` &nbsp;&middot;&nbsp; ${tr('card.perDay', { amount: perDay })}` : ''}</span>
        </div>
        ${distance ? `<div style="font-family:${fontStack};font-size:13px;color:#475569;">${distance}</div>` : ''}
        ${renderOfferInclusions(offer.inclusions, tr)}
        ${
          !expired && button && viewUrl
            ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr><td align="center" bgcolor="${brandColor}" style="border-radius:10px;"><a href="${viewUrl}" style="display:inline-block;padding:12px 20px;font-family:${fontStack};font-size:14px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">${tr('common.viewOfferAndChat')}</a></td></tr></table>`
            : ''
        }
      </td>
    </tr>
  </table>`;
};

const renderOfferCards = (offers, options) => ({ raw: offers.map((offer) => renderOfferCard(offer, options)).join('') });

const describeOfferText = (offer, tr = EN, lang = 'en') =>
  `- ${offer.label ? `${offerLabel(offer.label, tr)}: ` : ''}${offer.driverName || tr('common.driver')}, ${formatWholeCurrency(offer.totalPrice)}${
    offer.vehicleModel ? `, ${offer.vehicleModel}` : ''
  }${Number.isFinite(offer.totalKms) ? `, ${tr('card.kms', { km: offer.totalKms })}` : ''}${offer.viewUrl ? `\n  ${localizeUrl(offer.viewUrl, lang)}` : ''}`;

const listUnsubscribeHeaders = (preferencesUrl) =>
  preferencesUrl
    ? {
        // Our own preferences page, never the provider's unsubscribe: that one
        // blocklists the address for EVERY email, driver messages and booking
        // confirmations included. One-click (RFC 8058) switches the traveller
        // to messages-and-bookings only.
        'List-Unsubscribe': `<${preferencesUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      }
    : undefined;

const withTextFooter = (text, preferencesUrl, tr = EN) =>
  `${text}\n\n${tr('footer.textFooter')}${preferencesUrl ? `\n\n${tr('footer.textLessOften', { url: preferencesUrl })}` : ''}`;

const greeting = (tr, name, { html = true } = {}) =>
  tr('common.hi', { name: html ? escapeHtml(name || tr('common.there')) : name || tr('common.there') });

/** Sent the moment a quote request is posted: says what will happen and when. */
export const sendQuoteRequestReceivedEmail = async ({ traveler, brief, preferencesUrl }) => {
  if (!traveler?.email) {
    return;
  }

  const lang = await languageOf(traveler);
  const tr = emailT(lang);
  const route = briefRouteLabel(brief, tr);
  const requestsUrl = localizeUrl(buildUrl('/dashboard?tab=requests'), lang);
  const supportEmail = getSupportEmail();
  const dates = formatDateRange(brief?.startDate, brief?.endDate, lang);

  const html = buildEmailTemplate({
    lang,
    title: tr('received.title'),
    preheader: tr('received.preheader'),
    bodyLines: [
      greeting(tr, traveler.name),
      tr('received.body', { route: escapeHtml(route), dates, adults: tr('common.adults', { count: Number(brief?.adults) || 1 }) }),
      tr('received.nextTitle'),
      {
        raw: `<ol style="margin:0 0 14px 20px;padding:0;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};">
          ${tr('received.steps')
            .map((step, index, all) => `<li style="${index < all.length - 1 ? 'margin-bottom:6px;' : ''}font-family:${fontStack};">${step}</li>`)
            .join('\n          ')}
        </ol>`,
      },
      renderReassurance(tr),
      tr('received.favour', { email: supportEmail }),
    ],
    action: { label: tr('common.viewMyRequest'), url: requestsUrl },
    preferencesUrl,
  });

  const text = withTextFooter(
    `${greeting(tr, traveler.name, { html: false })}\n\n${tr('received.text', { route, dates, url: requestsUrl })}`,
    preferencesUrl,
    tr
  );

  await sendEmail({
    to: traveler.email,
    subject: tr('received.subject'),
    html,
    text,
    headers: listUnsubscribeHeaders(preferencesUrl),
    tags: [EMAIL_TAGS.REQUEST_RECEIVED],
  });
};

/** The first offer on a quote request. Later offers are summarised instead. */
export const sendFirstOfferEmail = async ({ traveler, brief, offer, replyTo, preferencesUrl }) => {
  if (!traveler?.email || !offer) {
    return;
  }

  const lang = await languageOf(traveler);
  const tr = emailT(lang);
  const route = briefRouteLabel(brief, tr);
  const driverName = offer.driverName || tr('common.aDriver');
  const price = formatWholeCurrency(offer.totalPrice);
  const viewUrl = localizeUrl(offer.viewUrl, lang);
  const previewFacts = [
    offer.vehicleModel,
    offer.days > 0 ? tr('common.days', { count: offer.days }) : null,
    offer.reviewCount > 0
      ? tr('first.ratingFrom', { rating: Number(offer.rating).toFixed(1), reviews: tr('common.reviews', { count: offer.reviewCount }) })
      : null,
  ].filter(Boolean).join(' · ');

  const html = buildEmailTemplate({
    lang,
    title: tr('first.title'),
    preheader: escapeHtml(`${previewFacts}${previewFacts ? '. ' : ''}${tr('first.more')}`),
    bodyLines: [
      greeting(tr, traveler.name),
      tr('first.body', { driver: escapeHtml(driverName), route: escapeHtml(route) }),
      renderOfferCards([offer], { button: false, tr, lang }),
      offer.note
        ? { raw: `<blockquote style="margin:0 0 16px 0;padding:12px 16px;border-left:4px solid ${brandColor};background:#f1f5f9;border-radius:12px;color:#0f172a;font-size:14px;line-height:1.6;font-family:${fontStack};">${formatMultiline(offer.note)}</blockquote>` }
        : null,
      replyTo ? tr('first.replyAsk', { driver: escapeHtml(driverName) }) : null,
      renderReassurance(tr),
    ],
    action: viewUrl ? { label: tr('common.viewOfferAndChat'), url: viewUrl } : null,
    replyable: Boolean(replyTo),
    preferencesUrl,
  });

  const details = `${price}${offer.vehicleModel ? `, ${offer.vehicleModel}` : ''}${
    Number.isFinite(offer.totalKms) ? `, ${tr('card.kms', { km: offer.totalKms })}` : ''
  }`;
  const text = withTextFooter(
    `${greeting(tr, traveler.name, { html: false })}\n\n${tr('first.text', { driver: driverName, route, details })}\n${
      offer.note ? `\n${offer.note}\n` : ''
    }\n${tr('first.viewOffer', { url: viewUrl || localizeUrl(buildUrl('/dashboard?tab=messages'), lang) })}`,
    preferencesUrl,
    tr
  );

  await sendEmail({
    to: traveler.email,
    subject: tr('first.subject', { driver: driverName, price, route }),
    html,
    text,
    replyTo,
    senderName: tr('message.senderVia', { sender: driverName, brand: getBrandName() }),
    headers: listUnsubscribeHeaders(preferencesUrl),
    tags: [EMAIL_TAGS.FIRST_OFFER],
  });
};

// Text for each summary is in digest.<variant>.* of the email texts.
const DIGEST_VARIANTS = {
  // A few hours after the first offer: our picks out of everything received.
  digest1: {
    tag: EMAIL_TAGS.DIGEST,
    subject: (tr, { total, route, shown }) =>
      total > shown
        ? tr('digest.digest1.subjectTop', { total, shown, route })
        : tr('digest.digest1.subjectAll', { drivers: tr('common.drivers', { count: total }), route }),
    title: (tr, { total }) => (total === 1 ? tr('digest.digest1.titleOne') : tr('digest.digest1.titleMany', { total })),
    intro: (tr, { total, shown, route, dates }) =>
      total > shown
        ? tr('digest.digest1.introTop', { total, shown, route, dates })
        : total === 1
          ? tr('digest.digest1.introOne', { route, dates })
          : tr('digest.digest1.introMany', { total, route, dates }),
    outro: (tr) => tr('digest.digest1.outro'),
  },
  // At most once a day: offers that arrived since we last wrote.
  update: {
    tag: EMAIL_TAGS.UPDATE,
    subject: (tr, { fresh, route }) => tr('digest.update.subject', { fresh: tr('common.newOffers', { count: fresh }), route }),
    title: (tr, { fresh }) => tr('digest.update.title', { fresh: tr('common.newOffers', { count: fresh }) }),
    intro: (tr, { fresh, total, route }) =>
      fresh === 1
        ? tr('digest.update.introOne', { route, total: tr('common.offers', { count: total }) })
        : tr('digest.update.introMany', { count: fresh, route, total: tr('common.offers', { count: total }) }),
    outro: (tr) => tr('digest.update.outro'),
  },
  // Three days on: ask what is in the way.
  digest2: {
    tag: EMAIL_TAGS.STILL_DECIDING,
    subject: (tr, { route }) => tr('digest.digest2.subject', { route }),
    title: (tr) => tr('digest.digest2.title'),
    intro: (tr, { total, route }) => tr('digest.digest2.intro', { route, total: tr('common.offers', { count: total }) }),
    outro: (tr) => tr('digest.digest2.outro'),
    askWhy: true,
  },
  // 30 and 14 days before the start date.
  approaching: {
    tag: EMAIL_TAGS.APPROACHING,
    subject: (tr, { daysToTrip }) => tr('digest.approaching.subject', { days: daysToTrip }),
    title: (tr, { daysToTrip }) => tr('digest.approaching.title', { days: daysToTrip }),
    intro: (tr, { total, route, startLabel }) =>
      tr('digest.approaching.intro', { route, start: startLabel, total: tr('common.offers', { count: total }) }),
    outro: (tr) => tr('digest.approaching.outro'),
  },
  // A day before the first bookable offer lapses.
  expiring: {
    tag: EMAIL_TAGS.EXPIRING,
    subject: (tr, { lead }) =>
      tr('digest.expiring.subject', { driver: lead.driverName || tr('common.YourDriver'), price: formatWholeCurrency(lead.totalPrice) }),
    title: (tr) => tr('digest.expiring.title'),
    intro: (tr, { lead, route }) =>
      tr('digest.expiring.intro', {
        driver: escapeHtml(lead.driverName || tr('common.YourDriver')),
        price: formatWholeCurrency(lead.totalPrice),
        route,
      }),
    outro: (tr) => tr('digest.expiring.outro'),
  },
};

const WHY_ANSWERS = ['price', 'dates', 'choice', 'booked'];

const renderWhyQuestion = (answerUrls = {}, tr = EN) => {
  const buttons = WHY_ANSWERS.filter((key) => answerUrls[key])
    .map(
      (key) =>
        `<tr><td style="padding:0 0 8px 0;"><a href="${answerUrls[key]}" style="display:block;padding:12px 16px;border:1px solid #cbd5e1;border-radius:10px;font-family:${fontStack};font-size:14px;font-weight:600;line-height:20px;color:#0f172a;text-decoration:none;">${escapeHtml(tr(`digest.why.${key}`))}</a></td></tr>`
    )
    .join('');
  if (!buttons) return null;
  return {
    raw: `<p style="${paragraphStyles}font-weight:700;">${tr('digest.why.title')}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">${buttons}</table>`,
  };
};

/**
 * A summary of the bookable offers on a quote request.
 *
 * `variant`: digest1 | update | digest2 | approaching | expiring (see DIGEST_VARIANTS).
 * `offers` are the cards to show, already picked and labelled by the caller;
 * `totalCount` is how many bookable offers exist in all, `freshCount` how many
 * arrived since the last summary (update only), `leadOffer` the one about to
 * expire (expiring only), `answerUrls` the "what's holding you back" links.
 * `replyTo` should be the support inbox: these replies are requests for help
 * choosing, not messages to one driver.
 */
export const sendQuoteOffersDigestEmail = async ({
  traveler,
  brief,
  offers = [],
  totalCount,
  freshCount = 0,
  leadOffer,
  daysToTrip,
  variant = 'digest1',
  answerUrls,
  replyTo,
  preferencesUrl,
}) => {
  if (!traveler?.email || offers.length === 0) {
    return;
  }

  const lang = await languageOf(traveler);
  const tr = emailT(lang);
  const copy = DIGEST_VARIANTS[variant] || DIGEST_VARIANTS.digest1;
  const total = Number.isFinite(totalCount) ? totalCount : offers.length;
  const dashboardUrl = localizeUrl(buildUrl('/dashboard?tab=messages'), lang);
  const startMonth = brief?.startDate ? new Date(brief.startDate).getUTCMonth() : -1;
  const context = {
    total,
    shown: offers.length,
    fresh: freshCount || offers.length,
    route: escapeHtml(briefRouteLabel(brief, tr)),
    dates: formatDateRange(brief?.startDate, brief?.endDate, lang),
    startLabel: formatDate(brief?.startDate, lang),
    lead: leadOffer || offers[0],
    daysToTrip,
  };
  const lowest = formatWholeCurrency(Math.min(...offers.map((offer) => Number(offer.totalPrice) || Infinity)));

  const html = buildEmailTemplate({
    lang,
    title: copy.title(tr, context),
    preheader: escapeHtml(`${lowest ? tr('digest.preheaderFrom', { price: lowest }) : ''}${tr('digest.preheader')}`),
    bodyLines: [
      greeting(tr, traveler.name),
      copy.intro(tr, context),
      // December and January are Sri Lanka's peak months.
      variant === 'expiring' && (startMonth === 11 || startMonth === 0) ? tr('digest.peak') : null,
      copy.askWhy ? renderWhyQuestion(answerUrls, tr) : null,
      renderOfferCards(offers, { tr, lang }),
      total > offers.length
        ? `<a href="${dashboardUrl}" style="font-family:${fontStack};color:${brandColor};font-weight:700;">${tr('digest.seeAll', { total })}</a>`
        : null,
      renderReassurance(tr),
      replyTo ? copy.outro(tr) : null,
    ],
    action: { label: total > 1 ? tr('digest.compareAll', { total }) : tr('digest.openOffer'), url: dashboardUrl },
    replyable: replyTo ? 'support' : false,
    preferencesUrl,
  });

  const plainContext = { ...context, route: briefRouteLabel(brief, tr) };
  const text = withTextFooter(
    `${greeting(tr, traveler.name, { html: false })}\n\n${copy.title(tr, plainContext)}\n\n${offers
      .map((offer) => describeOfferText(offer, tr, lang))
      .join('\n')}\n\n${tr('digest.text', { url: dashboardUrl })}`,
    preferencesUrl,
    tr
  );

  await sendEmail({
    to: traveler.email,
    subject: copy.subject(tr, plainContext),
    html,
    text,
    replyTo,
    headers: listUnsubscribeHeaders(preferencesUrl),
    tags: [copy.tag],
  });
};

/**
 * Sent once when a quote request's offers have all lapsed unbooked. `repostUrl`
 * re-posts the same request to drivers in one step.
 */
export const sendQuoteOffersExpiredEmail = async ({ traveler, brief, offers = [], repostUrl, preferencesUrl }) => {
  if (!traveler?.email) {
    return;
  }

  const lang = await languageOf(traveler);
  const tr = emailT(lang);
  const route = briefRouteLabel(brief, tr);
  const dashboardUrl = localizeUrl(buildUrl('/dashboard?tab=messages'), lang);

  const html = buildEmailTemplate({
    lang,
    title: tr('expired.title'),
    preheader: escapeHtml(tr('expired.preheader', { route })),
    bodyLines: [
      greeting(tr, traveler.name),
      tr('expired.body', { route: escapeHtml(route), dates: formatDateRange(brief?.startDate, brief?.endDate, lang) }),
      repostUrl ? tr('expired.repost') : tr('expired.noRepost'),
      repostUrl
        ? tr('expired.preferDriver').replace(
            /<link>(.*?)<\/link>/,
            `<a href="${dashboardUrl}" style="font-family:${fontStack};color:${brandColor};font-weight:700;">$1</a>`
          )
        : null,
      offers.length > 0 ? renderOfferCards(offers, { expired: true, tr, lang }) : null,
    ],
    action: repostUrl ? { label: tr('expired.actionRepost'), url: repostUrl } : { label: tr('expired.actionNew'), url: dashboardUrl },
    preferencesUrl,
  });

  const text = withTextFooter(
    `${greeting(tr, traveler.name, { html: false })}\n\n${tr('expired.text', { route })}\n\n${
      repostUrl ? `${tr('expired.textRepost', { url: repostUrl })}\n\n` : ''
    }${tr('expired.textAsk', { url: dashboardUrl })}`,
    preferencesUrl,
    tr
  );

  await sendEmail({
    to: traveler.email,
    subject: tr('expired.subject', { route }),
    html,
    text,
    headers: listUnsubscribeHeaders(preferencesUrl),
    tags: [EMAIL_TAGS.EXPIRED],
  });
};

/** Twelve hours after a request that no driver has answered yet. */
export const sendNoOffersYetEmail = async ({ traveler, brief, preferencesUrl }) => {
  if (!traveler?.email) {
    return;
  }

  const lang = await languageOf(traveler);
  const tr = emailT(lang);
  const route = briefRouteLabel(brief, tr);
  const requestsUrl = localizeUrl(buildUrl('/dashboard?tab=requests'), lang);
  const whatsApp = getWhatsAppNumber();

  const html = buildEmailTemplate({
    lang,
    title: tr('noOffers.title'),
    preheader: tr('noOffers.preheader'),
    bodyLines: [
      greeting(tr, traveler.name),
      tr('noOffers.body', { route: escapeHtml(route), dates: formatDateRange(brief?.startDate, brief?.endDate, lang) }),
      tr('noOffers.helpTitle'),
      {
        raw: `<ul style="margin:0 0 14px 20px;padding:0;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};">
          ${tr('noOffers.help')
            .map((item, index, all) => `<li style="${index < all.length - 1 ? 'margin-bottom:6px;' : ''}font-family:${fontStack};">${item.replace('{whatsapp}', escapeHtml(whatsApp))}</li>`)
            .join('\n          ')}
        </ul>`,
      },
      tr('noOffers.willEmail'),
    ],
    action: { label: tr('common.viewMyRequest'), url: requestsUrl },
    replyable: 'support',
    preferencesUrl,
  });

  const text = withTextFooter(
    `${greeting(tr, traveler.name, { html: false })}\n\n${tr('noOffers.text', { route, whatsapp: whatsApp, url: requestsUrl })}`,
    preferencesUrl,
    tr
  );

  await sendEmail({
    to: traveler.email,
    subject: tr('noOffers.subject', { route }),
    html,
    text,
    replyTo: getSupportEmail(),
    headers: listUnsubscribeHeaders(preferencesUrl),
    tags: [EMAIL_TAGS.NO_OFFERS],
  });
};

/**
 * One email for the offers a traveller has not opened that were sent directly
 * in a chat (offers on a quote request are covered by the summaries).
 * `offers`: [{ driverName, vehicleModel, totalPrice, startDate, viewUrl }].
 */
export const sendOfferReminderEmail = async ({ recipient, offers = [], preferencesUrl }) => {
  if (!recipient?.email || offers.length === 0) {
    return;
  }

  const lang = await languageOf(recipient);
  const tr = emailT(lang);
  const first = offers[0];
  const firstDriver = first.driverName || tr('common.yourDriver');
  const rows = offers
    .map(
      (offer) => `<tr>
        <td style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;${cellStyles}">
          <strong style="font-family:${fontStack};">${escapeHtml(offer.driverName || tr('common.driver'))}</strong> &middot; ${formatWholeCurrency(offer.totalPrice)}
          <div style="font-family:${fontStack};font-size:13px;color:#475569;">${[offer.vehicleModel ? escapeHtml(offer.vehicleModel) : null, offer.startDate ? tr('reminder.from', { date: formatDate(offer.startDate, lang) }) : null].filter(Boolean).join(' &middot; ')}</div>
          ${offer.viewUrl ? `<a href="${localizeUrl(offer.viewUrl, lang)}" style="font-family:${fontStack};font-size:13px;font-weight:700;color:${brandColor};">${tr('reminder.viewOffer')}</a>` : ''}
        </td>
      </tr><tr><td height="8" style="font-size:0;line-height:0;">&nbsp;</td></tr>`
    )
    .join('');

  const html = buildEmailTemplate({
    lang,
    title: offers.length === 1 ? tr('reminder.titleOne') : tr('reminder.titleMany', { count: offers.length }),
    preheader: escapeHtml(
      tr('reminder.preheader', { price: formatWholeCurrency(first.totalPrice), model: first.vehicleModel ? ` · ${first.vehicleModel}` : '' })
    ),
    bodyLines: [
      greeting(tr, recipient.name),
      offers.length === 1
        ? tr('reminder.bodyOne', { driver: escapeHtml(firstDriver) })
        : tr('reminder.bodyMany', { count: offers.length }),
      { raw: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;">${rows}</table>` },
      renderReassurance(tr),
    ],
    action: {
      label: offers.length === 1 ? tr('reminder.actionOne') : tr('reminder.actionMany'),
      url: offers.length === 1 && first.viewUrl ? localizeUrl(first.viewUrl, lang) : localizeUrl(buildUrl('/dashboard?tab=messages'), lang),
    },
    preferencesUrl,
  });

  const text = withTextFooter(
    `${greeting(tr, recipient.name, { html: false })}\n\n${
      offers.length === 1 ? tr('reminder.bodyOne', { driver: firstDriver }) : tr('reminder.bodyMany', { count: offers.length })
    }\n\n${offers.map((offer) => describeOfferText(offer, tr, lang)).join('\n')}`,
    preferencesUrl,
    tr
  );

  await sendEmail({
    to: recipient.email,
    subject:
      offers.length === 1
        ? first.startDate
          ? tr('reminder.subjectOneDate', { driver: firstDriver, price: formatWholeCurrency(first.totalPrice), date: formatDate(first.startDate, lang) })
          : tr('reminder.subjectOne', { driver: firstDriver, price: formatWholeCurrency(first.totalPrice) })
        : tr('reminder.subjectMany', { count: offers.length }),
    html,
    text,
    headers: listUnsubscribeHeaders(preferencesUrl),
    tags: [EMAIL_TAGS.OFFER_REMINDER],
  });
};

/** Three days before a confirmed trip: who is coming, where, and what to have ready. */
export const sendPreTripReminderEmail = async ({ traveler, booking, driver, vehicle }) => {
  if (!traveler?.email) {
    return;
  }

  const lang = await languageOf(traveler);
  const tr = emailT(lang);
  const driverName = driver?.name || tr('common.YourDriver');
  const dashboardUrl = localizeUrl(buildUrl('/dashboard?tab=bookings'), lang);

  const html = buildEmailTemplate({
    lang,
    title: tr('preTrip.title', { date: formatDate(booking?.startDate, lang) }),
    preheader: escapeHtml(
      booking?.startPoint
        ? tr('preTrip.preheaderAt', { driver: driverName, place: booking.startPoint })
        : tr('preTrip.preheader', { driver: driverName })
    ),
    bodyLines: [
      greeting(tr, traveler.name),
      tr('preTrip.away', { driver: escapeHtml(driverName) }),
      tr('preTrip.dates', { value: formatDateRange(booking?.startDate, booking?.endDate, lang) }),
      booking?.startPoint ? tr('preTrip.pickup', { value: escapeHtml(booking.startPoint) }) : null,
      vehicle?.model ? tr('preTrip.vehicle', { value: escapeHtml(vehicle.model) }) : null,
      driver?.contactNumber ? tr('preTrip.phone', { value: escapeHtml(driver.contactNumber) }) : null,
      tr('preTrip.total', { value: formatCurrency(booking?.payableTotal > 0 ? booking.payableTotal : booking?.totalPrice) }),
      tr('preTrip.readyTitle'),
      {
        raw: `<ul style="margin:0 0 14px 20px;padding:0;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};">
          <li style="margin-bottom:6px;font-family:${fontStack};">${booking?.flightNumber ? tr('preTrip.flightKnown', { flight: escapeHtml(booking.flightNumber) }) : tr('preTrip.flightUnknown')}</li>
          <li style="margin-bottom:6px;font-family:${fontStack};">${tr('preTrip.payment')}</li>
          <li style="font-family:${fontStack};">${tr('preTrip.meeting')}</li>
        </ul>`,
      },
      tr('preTrip.changed'),
    ],
    action: { label: tr('preTrip.action'), url: dashboardUrl },
  });

  const text = `${greeting(tr, traveler.name, { html: false })}\n\n${tr('preTrip.text', { driver: driverName, date: formatDate(booking?.startDate, lang) })}\n${
    booking?.startPoint ? `${tr('preTrip.textPickup', { value: booking.startPoint })}\n` : ''
  }${driver?.contactNumber ? `${tr('preTrip.textPhone', { value: driver.contactNumber })}\n` : ''}\n${tr('preTrip.textView', { url: dashboardUrl })}`;

  await sendEmail({
    to: traveler.email,
    subject: booking?.startPoint
      ? tr('preTrip.subjectAt', { driver: driverName, place: booking.startPoint })
      : tr('preTrip.subject', { driver: driverName }),
    html,
    text,
    tags: [EMAIL_TAGS.PRE_TRIP],
  });
};

export const sendBriefAlertEmail = async ({ drivers = [], brief }) => {
  if (!brief) {
    return;
  }

  const recipients = drivers.filter((driver) => driver?.email);

  if (!recipients.length) {
    return;
  }

  const briefUrl = buildUrl(`/briefs#brief-${brief.id || brief._id || ''}`);
  const brandName = getBrandName();

  await Promise.all(
    recipients.map((driver) => {
      const driverName = escapeHtml(driver.name || 'there');
      const travelerName = escapeHtml(brief.traveler?.name || 'A traveller');
      const html = buildEmailTemplate({
        title: 'New tour brief available',
        preheader: `${travelerName} shared a new trip request on ${brandName}.`,
        bodyLines: [
          `Hi ${driverName},`,
          `${travelerName} just posted a new trip brief.`,
          `<strong>Route:</strong> ${escapeHtml(brief.startLocation || 'TBD')} → ${escapeHtml(brief.endLocation || 'TBD')}`,
          `<strong>Dates:</strong> ${formatDateRange(brief.startDate, brief.endDate)}`,
          brief.message ? formatMultiline(brief.message) : null,
          'Share an offer from your driver portal to connect with this traveller.',
        ],
        action: {
          label: 'Open brief',
          url: briefUrl,
        },
      });

      const text = `Hi ${driver.name || 'there'},\n\n${brief.traveler?.name || 'A traveller'} posted a new trip brief.\nRoute: ${brief.startLocation || 'TBD'} -> ${brief.endLocation || 'TBD'}\nDates: ${formatDateRange(brief.startDate, brief.endDate)}\n\nReply from your driver portal: ${briefUrl}`;

      return sendEmail({
        to: driver.email,
        subject: 'New traveller brief available',
        html,
        text,
      });
    })
  );
};

const googleCalendarUrl = ({ title, startDate, endDate, details, location }) => {
  const day = (value, addDays = 0) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    date.setUTCDate(date.getUTCDate() + addDays);
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  };
  const from = day(startDate);
  const to = day(endDate || startDate, 1); // all-day events end on the day after
  if (!from || !to) return '';
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${from}/${to}`, details: details || '' });
  if (location) params.set('location', location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * The traveller's copy of a new booking.
 *
 * Booking through a driver's offer confirms it on the spot; a direct booking is
 * only a request until the driver accepts. A confirmed booking is the moment the
 * traveller commits, so it carries everything that removes a reason to cancel:
 * who the driver is and how to reach them, what the price covers, the
 * cancellation terms and a calendar link. `driver` ({ name, contactNumber,
 * profilePhoto }) and `inclusions` are only used when the booking is confirmed —
 * contact details are not shared before that.
 */
export const sendBookingRequestConfirmationEmail = async ({
  traveler,
  booking,
  vehicle,
  paymentNote,
  driver,
  inclusions,
}) => {
  if (!traveler?.email) {
    return;
  }

  const lang = await languageOf(traveler);
  const tr = emailT(lang);
  const confirmed = booking?.status === 'confirmed';
  const vehicleModel = vehicle?.model || tr('booking.aVehicle');
  const driverName = driver?.name || tr('common.yourDriver');
  const dashboardUrl = localizeUrl(buildUrl('/dashboard?tab=bookings'), lang);
  const dates = formatDateRange(booking?.startDate, booking?.endDate, lang);
  const startLabel = formatDate(booking?.startDate, lang);
  const cancellation = tr('booking.cancellation');
  const calendarUrl = confirmed
    ? googleCalendarUrl({
        title: tr('booking.calendarTitle', { driver: driverName }),
        startDate: booking?.startDate,
        endDate: booking?.endDate,
        location: booking?.startPoint,
        details: tr('booking.calendarDetails', { model: vehicleModel, brand: getBrandName(), url: dashboardUrl }),
      })
    : '';

  const confirmedLines = [
    booking?.startPoint
      ? tr('booking.confirmedBodyAt', { driver: escapeHtml(driverName), place: escapeHtml(booking.startPoint), date: startLabel })
      : tr('booking.confirmedBody', { driver: escapeHtml(driverName), date: startLabel }),
    {
      raw: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;border:1px solid #e2e8f0;border-radius:14px;">
        <tr>
          <td style="padding:16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${
                  driver?.profilePhoto
                    ? `<td width="64" valign="top"><img src="${driver.profilePhoto}" alt="" width="52" height="52" style="display:block;border:0;width:52px;height:52px;border-radius:26px;" /></td>`
                    : ''
                }
                <td valign="top" style="${cellStyles}">
                  <div style="font-family:${fontStack};font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(driverName)}</div>
                  <div style="font-family:${fontStack};font-size:13px;color:#475569;">${escapeHtml(vehicleModel)}</div>
                  ${driver?.contactNumber ? `<div style="font-family:${fontStack};font-size:14px;color:#0f172a;"><strong style="font-family:${fontStack};">${tr('booking.phone')}</strong> ${escapeHtml(driver.contactNumber)}</div>` : ''}
                </td>
              </tr>
            </table>
            <div style="margin-top:12px;font-family:${fontStack};font-size:14px;line-height:1.6;color:#0f172a;">
              <strong style="font-family:${fontStack};">${tr('booking.dates')}</strong> ${dates}<br />
              <strong style="font-family:${fontStack};">${tr('booking.total')}</strong> ${formatCurrency(booking?.payableTotal > 0 ? booking.payableTotal : booking?.totalPrice)}
            </div>
            ${renderOfferInclusions(inclusions, tr)}
          </td>
        </tr>
      </table>`,
    },
    paymentNote ? formatMultiline(paymentNote) : null,
    tr('booking.sendFlight'),
    tr('booking.ifChange'),
    {
      raw: `<ul style="margin:0 0 14px 20px;padding:0;color:#0f172a;font-size:14px;line-height:1.6;font-family:${fontStack};">${cancellation.map(
        (line) => `<li style="margin-bottom:4px;font-family:${fontStack};">${line}</li>`
      ).join('')}</ul>`,
    },
    calendarUrl
      ? `<a href="${calendarUrl}" style="font-family:${fontStack};color:${brandColor};font-weight:700;">${tr('booking.calendar')}</a>`
      : null,
  ];

  const pendingLines = [
    tr('booking.pendingBody', { model: escapeHtml(vehicleModel) }),
    tr('booking.tripDates', { value: dates }),
    tr('booking.totalEstimate', { value: formatCurrency(booking?.totalPrice) }),
    tr('booking.statusLine', { value: formatStatus(booking?.status, tr) }),
    paymentNote ? formatMultiline(paymentNote) : null,
    tr('booking.pendingNext'),
  ];

  const html = buildEmailTemplate({
    lang,
    title: confirmed ? tr('booking.titleConfirmed') : tr('booking.titlePending'),
    preheader: confirmed
      ? escapeHtml(tr('booking.preheaderConfirmed', { driver: driverName }))
      : tr('booking.preheaderPending', { model: escapeHtml(vehicleModel) }),
    bodyLines: [greeting(tr, traveler.name), ...(confirmed ? confirmedLines : pendingLines)],
    action: {
      label: tr('common.viewBooking'),
      url: dashboardUrl,
    },
  });

  const text = `${greeting(tr, traveler.name, { html: false })}\n\n${
    confirmed
      ? `${tr('booking.textConfirmed', { driver: driverName, model: vehicleModel })}${driver?.contactNumber ? `\n${tr('booking.textPhone', { value: driver.contactNumber })}` : ''}`
      : tr('booking.textPending', { model: vehicleModel })
  }\n${tr('booking.textDates', { value: dates })}\n${tr('booking.textTotal', { value: formatCurrency(booking?.totalPrice) })}\n${tr(
    'booking.textStatus',
    { value: formatStatus(booking?.status, tr) }
  )}${confirmed ? `\n\n${tr('booking.textCancellation')}\n${cancellation.map((line) => `- ${line}`).join('\n')}` : ''}\n\n${tr(
    'booking.textView',
    { url: dashboardUrl }
  )}`;

  await sendEmail({
    to: traveler.email,
    subject: confirmed
      ? tr('booking.subjectConfirmed', { driver: driverName, date: startLabel })
      : tr('booking.subjectPending', { model: vehicleModel }),
    html,
    text,
    tags: [EMAIL_TAGS.BOOKING],
  });
};

// The driver's notice of a new booking. A booking made from the driver's own
// offer arrives already confirmed, so it is announced as a booking (not a
// request) and carries the traveller's contact details. A direct booking is
// still a request the driver has to accept, and until they do the traveller's
// contact details stay out of the email (see utils/travellerContact.js).
export const sendBookingRequestAlertEmail = async ({ driver, traveler, booking, vehicle }) => {
  if (!driver?.email) {
    return;
  }

  const confirmed = booking?.status === 'confirmed';
  const travelerName = traveler?.name || 'A traveller';
  const vehicleModel = vehicle?.model || 'your vehicle';
  const dates = formatDateRange(booking?.startDate, booking?.endDate);
  const total = formatCurrency(booking?.totalPrice);

  const html = buildEmailTemplate({
    title: confirmed ? 'New booking received' : 'New booking request waiting',
    preheader: confirmed
      ? `${escapeHtml(travelerName)} booked ${escapeHtml(vehicleModel)}.`
      : `${escapeHtml(travelerName)} requested ${escapeHtml(vehicleModel)}.`,
    bodyLines: [
      `Hi ${escapeHtml(driver.name || 'there')},`,
      confirmed
        ? `${escapeHtml(travelerName)} accepted your offer and booked ${escapeHtml(vehicleModel)}. The booking is confirmed.`
        : `${escapeHtml(travelerName)} just requested ${escapeHtml(vehicleModel)}.`,
      `<strong>Dates:</strong> ${dates}`,
      `<strong>${confirmed ? 'Total' : 'Estimated total'}:</strong> ${total}`,
      confirmed && traveler?.email ? `<strong>Traveller email:</strong> ${escapeHtml(traveler.email)}` : null,
      confirmed && traveler?.phoneNumber ? `<strong>Traveller phone:</strong> ${escapeHtml(traveler.phoneNumber)}` : null,
      confirmed
        ? 'Open your driver portal to see the trip details and message the traveller.'
        : "Reply in your driver portal to accept, reject, or ask follow-up questions. The traveller's contact details are shared once the booking is confirmed.",
    ],
    action: {
      label: confirmed ? 'View booking' : 'Review booking',
      url: buildUrl('/portal/driver/messages'),
    },
  });

  const contactText = confirmed
    ? `${traveler?.email ? `\nTraveller email: ${traveler.email}` : ''}${
        traveler?.phoneNumber ? `\nTraveller phone: ${traveler.phoneNumber}` : ''
      }`
    : '';
  const text = `Hi ${driver.name || 'there'},\n\n${travelerName} ${
    confirmed ? 'accepted your offer and booked' : 'requested'
  } ${vehicleModel}.${confirmed ? ' The booking is confirmed.' : ''}\nDates: ${dates}\nTotal: ${total}${contactText}\n\nOpen your driver portal to ${
    confirmed ? 'see the trip details' : 'respond'
  }.`;

  await sendEmail({
    to: driver.email,
    subject: confirmed ? `New booking received for ${vehicleModel}` : `New booking request for ${vehicleModel}`,
    html,
    text,
  });
};

export const sendBookingStatusUpdateEmail = async ({
  recipient,
  booking,
  vehicle,
  status,
  note,
}) => {
  if (!recipient?.email) {
    return;
  }

  const { role } = recipient;
  const lang = await languageOf(recipient);
  const tr = emailT(lang);
  const currentStatus = status || booking?.status;
  const statusLabel = formatStatus(currentStatus, tr);
  const englishLabel = formatStatus(currentStatus);
  const title =
    englishLabel === 'Confirmed'
      ? tr('status.titleConfirmed')
      : englishLabel === 'Rejected'
        ? tr('status.titleRejected')
        : englishLabel === 'Cancelled'
          ? tr('status.titleCancelled')
          : tr('status.titleUpdated');
  const dates = formatDateRange(booking?.startDate, booking?.endDate, lang);
  const total = formatCurrency(booking?.totalPrice);
  const inSentence = statusLabel.toLowerCase();

  const html = buildEmailTemplate({
    lang,
    title,
    preheader: tr('status.preheader', { model: vehicle?.model || tr('status.yourBooking'), status: inSentence }),
    bodyLines: [
      greeting(tr, recipient.name),
      tr('status.body', { model: vehicle?.model || tr('status.theBooking'), status: statusLabel }),
      tr('status.tripDates', { value: dates }),
      tr('status.total', { value: total }),
      note ? formatMultiline(note) : null,
      tr('status.follow'),
    ],
    action: {
      label: role === 'driver' ? 'Open driver portal' : tr('common.viewBooking'),
      url: role === 'driver' ? buildUrl('/portal/driver/messages') : localizeUrl(buildUrl('/dashboard'), lang),
    },
  });

  const text = `${greeting(tr, recipient.name, { html: false })}\n\n${tr('status.text', {
    model: vehicle?.model || tr('status.yourBooking'),
    status: statusLabel,
  })}\n${tr('status.textDates', { value: dates })}\n${tr('status.textTotal', { value: total })}\n${note || ''}\n\n${
    role === 'driver' ? 'Visit your driver portal to review details.' : tr('status.textVisit')
  }`;

  await sendEmail({
    to: recipient.email,
    subject: tr('status.subject', { model: vehicle?.model || tr('status.booking'), status: statusLabel }),
    html,
    text,
  });
};

export const sendDriverStatusEmail = async ({ driver, status, note }) => {
  if (!driver?.email) {
    return;
  }

  const statusLabel = formatStatus(status);
  const isApproved = statusLabel === 'Approved';
  const html = buildEmailTemplate({
    title: `Driver application ${statusLabel.toLowerCase()}`,
    preheader: `Your driver profile is now ${statusLabel.toLowerCase()}.`,
    bodyLines: [
      `Hi ${escapeHtml(driver.name || 'there')},`,
      isApproved
        ? 'Great news—your driver application has been approved. You can now publish vehicles and respond to traveller requests.'
        : `Your driver application is currently marked as ${statusLabel.toLowerCase()}.`,
      note ? formatMultiline(note) : null,
    ],
    action: {
      label: isApproved ? 'Open driver portal' : 'Review profile',
      url: buildUrl('/portal/driver'),
    },
  });

  const text = `Hi ${driver.name || 'there'},\n\nYour driver application is now ${statusLabel.toLowerCase()}.\n${
    note || ''
  }\n\nVisit your driver portal for more details.`;

  await sendEmail({
    to: driver.email,
    subject: `Driver application ${statusLabel.toLowerCase()}`,
    html,
    text,
  });
};

export const sendDriverProfileCompletionEmail = async ({ driver }) => {
  if (!driver?.email) {
    return;
  }

  const html = buildEmailTemplate({
    title: 'Finish setting up your driver profile',
    preheader: 'Add a photo, bio, live location, and your first vehicle to start earning.',
    bodyLines: [
      `Hi ${escapeHtml(driver.name || 'there')},`,
      'Your driver account is approved. Complete these quick steps so travellers can trust and book you:',
      { raw: `<ul style="margin:0 0 14px 18px;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};"><li>Upload a friendly profile photo</li><li>Add a short description about your tours</li><li>Set your live location so you appear on the homepage map</li><li>Add your first vehicle listing</li></ul>` },
      'It only takes a few minutes and helps you show up in searches right away.',
    ],
    action: {
      label: 'Open profile checklist',
      url: buildUrl('/portal/driver#profile'),
    },
  });

  const text = `Hi ${driver.name || 'there'},\n\nYour driver account is approved. Finish your profile so travellers can book you:\n• Upload a profile photo\n• Add a short description\n• Set your live location\n• Add your first vehicle listing\n\nOpen your checklist: ${buildUrl('/portal/driver#profile')}`;

  await sendEmail({
    to: driver.email,
    subject: 'Finish setting up your driver profile',
    html,
    text,
  });
};

export const sendVehicleStatusEmail = async ({ driver, vehicle, status, note }) => {
  if (!driver?.email) {
    return;
  }

  const statusLabel = formatStatus(status);
  const isApproved = statusLabel === 'Approved';

  const html = buildEmailTemplate({
    title: `Vehicle ${statusLabel.toLowerCase()}`,
    preheader: `${escapeHtml(vehicle?.model || 'Vehicle')} is now ${statusLabel.toLowerCase()}.`,
    bodyLines: [
      `Hi ${escapeHtml(driver.name || 'there')},`,
      `${escapeHtml(vehicle?.model || 'Your vehicle submission')} is now <strong>${statusLabel}</strong>.`,
      note ? formatMultiline(note) : null,
      isApproved
        ? 'Travellers can now see this vehicle in the marketplace.'
        : 'Update the vehicle details and resubmit when ready.',
    ],
    action: {
      label: 'Manage vehicles',
      url: buildUrl('/portal/driver'),
    },
  });

  const text = `Hi ${driver.name || 'there'},\n\n${
    vehicle?.model || 'Your vehicle'
  } is now ${statusLabel.toLowerCase()}.\n${note || ''}\n\nVisit your driver portal to review details.`;

  await sendEmail({
    to: driver.email,
    subject: `${vehicle?.model || 'Vehicle'} ${statusLabel.toLowerCase()}`,
    html,
    text,
  });
};

// Sent once a month to drivers who actually owe commission for the month just
// ended. Drivers with nothing due are never contacted.
const INSURANCE_EMAILS = {
  // An admin asked the driver to verify the vehicle's insurance again.
  requested: {
    subject: (model) => `Action needed: verify the insurance for your ${model}`,
    title: 'Please verify your vehicle insurance',
    lines: (model) => [
      `We need to verify the insurance for your <strong>${model}</strong>. Until that is done the vehicle is not shown to travellers.`,
      'To put it back on the marketplace, open the vehicle in your driver portal or app and resubmit it with:',
      { list: ['A clear photo of your current passenger insurance document', 'The cover start and end dates', '5 photos of the vehicle'] },
    ],
  },
  // A week before the cover period ends.
  expiring: {
    subject: (model, date) => `Your ${model} insurance expires on ${date}`,
    title: 'Your vehicle insurance expires soon',
    lines: (model, date) => [
      `The insurance on file for your <strong>${model}</strong> ends on <strong>${date}</strong>.`,
      'Once you have renewed it, open the vehicle in your driver portal or app and upload the new passenger insurance document with its cover dates.',
      'If the cover runs out before you update it, the vehicle is taken off the marketplace until you do.',
    ],
  },
  // The cover period has ended and the vehicle was taken off the marketplace.
  expired: {
    subject: (model) => `Your ${model} is off the marketplace: insurance expired`,
    title: 'Your vehicle insurance has expired',
    lines: (model, date) => [
      `The insurance on file for your <strong>${model}</strong> ended on <strong>${date}</strong>, so the vehicle is no longer shown to travellers.`,
      'To put it back, open the vehicle in your driver portal or app and upload your new passenger insurance document with its cover dates. We will review it as soon as we can.',
      'Bookings you have already confirmed are not affected.',
    ],
  },
  // An admin could not accept the insurance that was submitted.
  rejected: {
    subject: (model) => `We could not verify the insurance for your ${model}`,
    title: 'Your insurance could not be verified',
    lines: (model) => [
      `We were not able to verify the insurance you submitted for your <strong>${model}</strong>, so the vehicle is not shown to travellers for now.`,
      'Please upload a clear photo of your current passenger insurance document, with the correct cover dates, from your driver portal or app.',
    ],
  },
};

/**
 * Notices to a driver about a vehicle's insurance.
 * `kind`: requested | expiring | expired | rejected. `note` is the admin's
 * message (requested, rejected); `endDate` the cover end date (expiring, expired).
 */
export const sendVehicleInsuranceEmail = async ({ driver, vehicle, kind, note, endDate }) => {
  const copy = INSURANCE_EMAILS[kind];
  if (!driver?.email || !copy) {
    return;
  }

  const plainModel = vehicle?.model || 'vehicle';
  const model = escapeHtml(plainModel);
  const date = endDate ? formatDate(endDate) : '';
  const portalUrl = buildUrl('/portal/driver');
  const lines = copy.lines(model, date);

  const html = buildEmailTemplate({
    title: copy.title,
    preheader: escapeHtml(copy.subject(plainModel, date)),
    bodyLines: [
      `Hi ${escapeHtml(driver.name || 'there')},`,
      ...lines.map((line) =>
        typeof line === 'string'
          ? line
          : {
              raw: `<ul style="margin:0 0 14px 20px;padding:0;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};">${line.list
                .map((item) => `<li style="margin-bottom:4px;font-family:${fontStack};">${item}</li>`)
                .join('')}</ul>`,
            }
      ),
      note ? `<strong>Note from our team:</strong> ${formatMultiline(note)}` : null,
    ],
    action: { label: 'Open my vehicles', url: portalUrl },
  });

  const text = `Hi ${driver.name || 'there'},\n\n${lines
    .map((line) => (typeof line === 'string' ? line.replace(/<[^>]+>/g, '') : line.list.map((item) => `- ${item}`).join('\n')))
    .join('\n\n')}${note ? `\n\nNote from our team: ${note}` : ''}\n\nOpen your vehicles: ${portalUrl}`;

  await sendEmail({
    to: driver.email,
    subject: copy.subject(plainModel, date),
    html,
    text,
    tags: [`driver-insurance-${kind}`],
  });
};

export const sendCommissionDueEmail = async ({
  to,
  driverName,
  periodLabel,
  amountLabel,
  bookingCount,
  earningsUrl,
}) => {
  const safeName = escapeHtml(driverName || 'there');
  const safePeriod = escapeHtml(periodLabel || 'last month');
  const safeAmount = escapeHtml(amountLabel || '');
  const trips = Number(bookingCount) || 0;
  const tripLabel = `${trips} completed trip${trips === 1 ? '' : 's'}`;
  const brandName = getBrandName();

  const html = buildEmailTemplate({
    title: `Commission due for ${safePeriod}`,
    preheader: `${safeAmount} commission is due for ${safePeriod}`,
    bodyLines: [
      `Hi ${safeName},`,
      `Your commission for <b>${safePeriod}</b> is <b>${safeAmount}</b>, based on ${tripLabel} that ended during the month.`,
      'You can see the full breakdown, along with our bank details for the transfer, in the <b>My Earnings</b> tab of your driver dashboard.',
      'Once you have paid, upload your transfer slip there so we can confirm it against your account.',
      'If anything looks wrong, reply to this email or contact support@carwithdriver.lk and we will check it with you.',
    ],
    action: {
      label: 'Open My Earnings',
      url: earningsUrl,
    },
  });

  const text =
    `Hi ${driverName || 'there'},\n\n` +
    `Your commission for ${periodLabel} is ${amountLabel}, based on ${tripLabel} that ended during the month.\n\n` +
    `The full breakdown and our bank details are in the My Earnings tab of your driver dashboard:\n${earningsUrl}\n\n` +
    `After paying, upload your transfer slip there so we can confirm it.\n\n` +
    `Questions? Contact support@carwithdriver.lk.\n\n${brandName}`;

  await sendEmail({
    to,
    subject: `Commission due for ${periodLabel} — ${amountLabel}`,
    html,
    text,
  });
};

// ---- Unpaid-commission freeze emails (services/commissionFreezeService.js) ----
// `periods` is a list of { label: 'November 2026', amountLabel: 'US$12.50' }.
const periodLinesHtml = (periods) =>
  (periods || []).map((p) => `• <b>${escapeHtml(p.label)}</b>: ${escapeHtml(p.amountLabel)}`).join('<br>');
const periodLinesText = (periods) => (periods || []).map((p) => `- ${p.label}: ${p.amountLabel}`).join('\n');
const FREEZE_EFFECTS =
  'While frozen you cannot send quotes or messages, travellers cannot book your vehicles, and your profile is hidden from the website.';
const HOW_TO_PAY =
  'Pay using the bank details in the <b>My Earnings</b> tab of your driver dashboard and upload the transfer slip there. Your account unfreezes as soon as our team confirms the payment.';
const HOW_TO_PAY_TEXT =
  'Pay using the bank details in the My Earnings tab of your driver dashboard and upload the transfer slip there. Your account unfreezes as soon as our team confirms the payment.';

/** One-time announcement of the deadline and freeze rule. */
export const sendCommissionPolicyNoticeEmail = async ({ to, driverName, firstDeadlineLabel, earningsUrl }) => {
  const brandName = getBrandName();
  const safeName = escapeHtml(driverName || 'there');
  const safeDeadline = escapeHtml(firstDeadlineLabel);
  const html = buildEmailTemplate({
    title: 'Commission must be paid by the 10th of each month',
    preheader: `Starting ${safeDeadline}, unpaid commission freezes your account`,
    bodyLines: [
      `Hi ${safeName},`,
      'From now on, the commission for each month must be paid by the <b>10th of the following month</b>, and confirmed by our team.',
      `This starts with November's commission, which is due by <b>${safeDeadline}</b>.`,
      `If a month's commission is still unpaid after the 10th, your account is <b>frozen</b> automatically. ${FREEZE_EFFECTS}`,
      'It unfreezes as soon as we confirm your payment. Upload your transfer slip early so we have time to check it.',
      'You will get a reminder on the 1st, a warning on the 7th and a final notice on the 10th. Questions? Reply to this email or contact support@carwithdriver.lk.',
    ],
    action: { label: 'Open My Earnings', url: earningsUrl },
  });
  const text =
    `Hi ${driverName || 'there'},\n\n` +
    `From now on, each month's commission must be paid by the 10th of the following month and confirmed by our team. ` +
    `This starts with November's commission, due by ${firstDeadlineLabel}.\n\n` +
    `If a month's commission is still unpaid after the 10th, your account is frozen automatically. ${FREEZE_EFFECTS} ` +
    `It unfreezes as soon as we confirm your payment.\n\nMy Earnings: ${earningsUrl}\n\n` +
    `Questions? Contact support@carwithdriver.lk.\n\n${brandName}`;
  await sendEmail({ to, subject: 'New rule: pay commission by the 10th to keep your account active', html, text });
};

/** Before the deadline: `final` = it's the last day. */
export const sendCommissionFreezeWarningEmail = async ({ to, driverName, periodLabel, amountLabel, deadlineLabel, final = false, earningsUrl }) => {
  const brandName = getBrandName();
  const safeName = escapeHtml(driverName || 'there');
  const safePeriod = escapeHtml(periodLabel);
  const safeAmount = escapeHtml(amountLabel);
  const safeDeadline = escapeHtml(deadlineLabel);
  const title = final ? `Last day: pay your ${safePeriod} commission today` : `Your ${safePeriod} commission is due by ${safeDeadline}`;
  const html = buildEmailTemplate({
    title,
    preheader: final ? 'Your account will be frozen tomorrow if unpaid' : `${safeAmount} is due by ${safeDeadline}`,
    bodyLines: [
      `Hi ${safeName},`,
      final
        ? `Today is the last day to pay your <b>${safePeriod}</b> commission of <b>${safeAmount}</b>. If it is not paid and confirmed by the end of today, your account will be <b>frozen</b> tomorrow.`
        : `Your <b>${safePeriod}</b> commission of <b>${safeAmount}</b> is due by <b>${safeDeadline}</b>. If it is not paid by then, your account will be <b>frozen</b>.`,
      FREEZE_EFFECTS,
      HOW_TO_PAY,
    ],
    action: { label: 'Pay commission', url: earningsUrl },
  });
  const text =
    `Hi ${driverName || 'there'},\n\n` +
    (final
      ? `Today is the last day to pay your ${periodLabel} commission of ${amountLabel}. If it is not paid and confirmed by the end of today, your account will be frozen tomorrow.`
      : `Your ${periodLabel} commission of ${amountLabel} is due by ${deadlineLabel}. If it is not paid by then, your account will be frozen.`) +
    `\n\n${FREEZE_EFFECTS}\n\n${HOW_TO_PAY_TEXT}\n${earningsUrl}\n\n${brandName}`;
  await sendEmail({
    to,
    subject: final ? `Last day: ${periodLabel} commission (${amountLabel}) or your account is frozen tomorrow` : `Reminder: ${periodLabel} commission (${amountLabel}) due by ${deadlineLabel}`,
    html,
    text,
  });
};

/** The account was frozen (`reminder` = the repeat email while it stays frozen). */
export const sendCommissionFrozenEmail = async ({ to, driverName, periods, reminder = false, earningsUrl }) => {
  const brandName = getBrandName();
  const safeName = escapeHtml(driverName || 'there');
  const html = buildEmailTemplate({
    title: reminder ? 'Your account is still frozen' : 'Your account has been frozen',
    preheader: 'Unpaid commission. Pay to unfreeze your account.',
    bodyLines: [
      `Hi ${safeName},`,
      reminder
        ? 'Your account is still frozen because this commission is unpaid:'
        : 'Your account has been frozen because this commission was not paid by the 10th:',
      periodLinesHtml(periods),
      FREEZE_EFFECTS,
      HOW_TO_PAY,
      'Confirmed bookings you already have are not affected. If you think this is a mistake, reply to this email or contact support@carwithdriver.lk.',
    ],
    action: { label: 'Pay and unfreeze', url: earningsUrl },
  });
  const text =
    `Hi ${driverName || 'there'},\n\n` +
    (reminder ? 'Your account is still frozen because this commission is unpaid:\n' : 'Your account has been frozen because this commission was not paid by the 10th:\n') +
    `${periodLinesText(periods)}\n\n${FREEZE_EFFECTS}\n\n${HOW_TO_PAY_TEXT}\n${earningsUrl}\n\n` +
    `Confirmed bookings you already have are not affected.\n\n${brandName}`;
  await sendEmail({ to, subject: reminder ? 'Reminder: your account is still frozen (unpaid commission)' : 'Your account has been frozen (unpaid commission)', html, text });
};

/** Every overdue month is paid and the freeze is lifted. */
export const sendCommissionUnfrozenEmail = async ({ to, driverName, dashboardUrl }) => {
  const brandName = getBrandName();
  const safeName = escapeHtml(driverName || 'there');
  const html = buildEmailTemplate({
    title: 'Your account is active again',
    preheader: 'Thanks, your commission payment is confirmed',
    bodyLines: [
      `Hi ${safeName},`,
      'Thank you, your commission payment has been confirmed and your account is <b>active again</b>.',
      'You can send quotes and messages, travellers can book your vehicles, and your profile is back on the website.',
    ],
    action: { label: 'Open dashboard', url: dashboardUrl },
  });
  const text =
    `Hi ${driverName || 'there'},\n\nThank you, your commission payment has been confirmed and your account is active again. ` +
    `You can send quotes and messages, and travellers can book your vehicles.\n\n${dashboardUrl}\n\n${brandName}`;
  await sendEmail({ to, subject: 'Your account is active again', html, text });
};

export const sendReviewRequestEmail = async ({
  to,
  travelerName,
  driverName,
  vehicleModel,
  tripDates,
  startDate,
  endDate,
  language,
  reviewUrl,
}) => {
  const lang = await languageOf({ email: to, language });
  const tr = emailT(lang);
  // English keeps the caller's date wording; other languages format the dates themselves.
  const dates = lang === 'en' || !startDate ? tripDates || '' : formatDateRange(startDate, endDate, lang);
  const plainDriver = driverName || tr('common.yourDriver');
  const safeDriver = escapeHtml(plainDriver);
  const safeVehicle = escapeHtml(vehicleModel || tr('review.yourVehicle'));
  const safeDates = escapeHtml(dates);
  const brandName = getBrandName();
  const link = localizeUrl(reviewUrl, lang);

  const html = buildEmailTemplate({
    lang,
    title: tr('review.title', { driver: safeDriver }),
    preheader: tr('review.preheader', { driver: safeDriver }),
    bodyLines: [
      greeting(tr, travelerName),
      safeDates
        ? tr('review.hopeDates', { driver: safeDriver, dates: safeDates, vehicle: safeVehicle })
        : tr('review.hope', { driver: safeDriver, vehicle: safeVehicle }),
      tr('review.ask'),
      tr('review.noSignIn'),
    ],
    action: {
      label: tr('review.action'),
      url: link,
    },
  });

  const text = `${greeting(tr, travelerName, { html: false })}\n\n${
    dates ? tr('review.textDates', { driver: plainDriver, dates }) : tr('review.text', { driver: plainDriver })
  }\n\n${tr('review.textLink', { url: link })}\n\n${tr('review.textThanks', { brand: brandName })}`;

  await sendEmail({
    to,
    subject: tr('review.subject', { driver: plainDriver }),
    html,
    text,
  });
};

