import Brevo from 'sib-api-v3-sdk';
import { OFFER_INCLUSION_KEYS, OFFER_INCLUSION_LABELS } from '../utils/offerInclusions.js';

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
// Brand green, darkened so white text on it clears 4.5:1 contrast.
const brandColor = '#0f7a45';

const paragraphStyles = `margin:0 0 14px 0;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};`;
// Mid grey: reads as secondary but stays legible on a phone outdoors.
const footerStyles = `margin:0 0 6px 0;color:#64748b;font-size:13px;line-height:1.6;font-family:${fontStack};`;

const getLogoUrl = () => process.env.EMAIL_LOGO_URL || buildUrl('/email-logo.png');
const getWhatsAppNumber = () => process.env.SUPPORT_WHATSAPP || '+94 76 3021 483';

// `replyable`: true when a reply is posted into the driver chat, 'support' when
// it reaches our own inbox, false for send-only emails.
const getDefaultFooterLines = ({ replyable = false, preferencesUrl = '' } = {}) => {
  const whatsApp = getWhatsAppNumber();
  const whatsAppLink = `<a href="https://wa.me/${whatsApp.replace(/\D/g, '')}" style="color:#64748b;font-family:${fontStack};">${whatsApp}</a>`;
  return [
    replyable === 'support'
      ? 'Reply to this email and our team in Sri Lanka will get back to you.'
      : replyable
        ? 'Replies to this email are posted to your chat with the driver.'
        : "This is an automated message — please don't reply to this email.",
    `Questions? WhatsApp us on ${whatsAppLink} or email ${getSupportEmail()}.`,
    preferencesUrl
      ? `Getting too many emails? <a href="${preferencesUrl}" style="color:#64748b;font-family:${fontStack};">Email me less often</a>.`
      : null,
    `You are receiving this email because you have an active account on ${getBrandName()}.`,
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

const formatStatus = (status) => {
  if (!status) {
    return '';
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

const formatDate = (value) => {
  if (!value) {
    return 'TBD';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'TBD';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateRange = (start, end) => {
  if (!start || !end) {
    return 'TBD';
  }
  return `${formatDate(start)} — ${formatDate(end)}`;
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
// the email itself. The logo sits on a brand-coloured band so it reads the same
// in light and dark mode.
const buildEmailTemplate = ({
  title,
  preheader,
  bodyLines = [],
  action,
  footerLines = [],
  replyable = false,
  preferencesUrl = '',
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
              <td bgcolor="${brandColor}" style="padding:16px 28px;">
                <img src="${getLogoUrl()}" alt="${escapeHtml(getBrandName())}" height="40" style="display:block;border:0;outline:none;height:40px;width:auto;font-family:${fontStack};font-size:18px;font-weight:700;color:#ffffff;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;font-family:${fontStack};">
                  ${title}
                </h1>
                ${renderParagraphs(bodyLines)}
                ${action ? renderButton(action) : ''}
                ${renderFooter([...footerLines, ...getDefaultFooterLines({ replyable, preferencesUrl })])}
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
  const recipientName = escapeHtml(recipient.name || 'there');
  const plainSender = sender?.name || 'your contact';
  const senderName = escapeHtml(plainSender);
  const bodies = (Array.isArray(messages) && messages.length > 0 ? messages : [messagePreview]).filter(Boolean);
  const brandName = getBrandName();
  const price = Number.isFinite(Number(offerPrice)) && offerPrice !== null && offerPrice !== undefined ? formatWholeCurrency(offerPrice) : '';

  // The start of the message in the subject shows a real question is waiting.
  const firstLine = (bodies[0] || '').replace(/\s+/g, ' ').trim();
  const snippet = firstLine.length > 50 ? `${firstLine.slice(0, 50).trimEnd()}…` : firstLine;
  const subject = isOffer
    ? price
      ? `${plainSender}: ${price} offer for your trip`
      : `${plainSender} sent you a trip offer`
    : snippet
      ? `${plainSender}: "${snippet}"`
      : `New message from ${plainSender}`;

  const quoteStyle = `margin:0 0 12px 0;padding:12px 16px;border-left:4px solid ${brandColor};background:#f1f5f9;border-radius:12px;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};`;
  const lines = [
    `Hi ${recipientName},`,
    `${senderName} ${
      isOffer ? 'sent you a trip offer' : bodies.length > 1 ? `sent you ${bodies.length} new messages` : 'sent you a new message'
    }${vehicleModel ? ` about ${escapeHtml(vehicleModel)}` : ''} on ${brandName}.`,
    ...bodies.map((body) => ({ raw: `<blockquote style="${quoteStyle}">${formatMultiline(body)}</blockquote>` })),
    replyTo
      ? `Reply to this email to answer ${senderName} directly. Your reply goes straight to the chat.`
      : 'Reply from your dashboard to keep the conversation moving.',
    isOffer && forTraveller ? renderReassurance() : null,
  ];

  const html = buildEmailTemplate({
    title: isOffer ? 'New trip offer' : bodies.length > 1 ? 'New messages waiting' : 'New message waiting',
    preheader: replyTo
      ? `Reply to this email to answer ${senderName} directly.`
      : `${senderName} ${isOffer ? 'shared a trip offer' : 'sent you a message'} on ${brandName}`,
    bodyLines: lines,
    action: {
      label: isOffer ? 'View offer and chat' : 'Reply in chat',
      url: conversationUrl || (recipient?.role === 'driver' ? buildUrl('/portal/driver/messages') : buildUrl('/dashboard')),
    },
    replyable: Boolean(replyTo),
  });

  const text = `Hi ${recipient.name || 'there'},\n\n${plainSender} ${
    isOffer ? 'sent you a trip offer' : 'sent you a new message'
  }.\n\n${bodies.join('\n\n')}\n\n${replyTo ? 'Reply to this email, or open' : 'Open'} your ${
    recipient?.role === 'driver' ? 'driver portal' : 'dashboard'
  } to reply.`;

  await sendEmail({
    to: recipient.email,
    subject,
    html,
    text,
    replyTo,
    // A named person gets more attention than a system alert; the address is unchanged.
    senderName: forTraveller ? `${plainSender} via ${brandName}` : undefined,
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

const briefRouteLabel = (brief) =>
  [brief?.startLocation, brief?.endLocation].filter(Boolean).join(' → ') || 'your trip';

// The promises the site makes on its pricing and cancellation pages. Kept in
// one place so every offer email says the same thing.
const REASSURANCE_POINTS = [
  'No booking fee',
  'No deposit',
  'Pay your driver on day one',
  'Free cancellation up to 2 days before your trip',
];

const renderReassurance = () => ({
  raw: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
    <tr>
      <td bgcolor="#eefaf3" style="padding:14px 16px;border-radius:12px;${cellStyles}">
        <strong style="font-family:${fontStack};">Booking is risk-free.</strong> ${REASSURANCE_POINTS.join(' &middot; ')}. The price is locked once you accept an offer.
      </td>
    </tr>
  </table>`,
});

const renderStars = (rating) => {
  const full = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return `<span style="color:#f59e0b;">${'&#9733;'.repeat(full)}</span><span style="color:#cbd5e1;">${'&#9733;'.repeat(5 - full)}</span>`;
};

const describeDriverFacts = (offer) =>
  [
    offer.reviewCount > 0
      ? `${renderStars(offer.rating)} ${Number(offer.rating).toFixed(1)} &middot; ${plural(offer.reviewCount, 'review')}`
      : 'New on the platform',
    offer.experienceYears > 0 ? `${offer.experienceYears} yr${offer.experienceYears === 1 ? '' : 's'}' experience` : null,
  ]
    .filter(Boolean)
    .join(' &middot; ');

const renderOfferInclusions = (inclusions) => {
  // Offers sent before inclusions existed carry no list; showing six crosses
  // for those would wrongly read as "nothing included".
  if (!Array.isArray(inclusions)) return '';
  const cell = (key) => {
    const included = inclusions.includes(key);
    // Grey cross, not red: in an email red reads as a warning about the offer.
    return `<td width="50%" valign="top" style="padding:2px 6px 2px 0;font-family:${fontStack};font-size:13px;line-height:1.45;color:${included ? '#0f172a' : '#94a3b8'};">
      <span style="color:${included ? '#059669' : '#94a3b8'};font-weight:800;">${included ? '&#10003;' : '&#10005;'}</span>
      ${escapeHtml(OFFER_INCLUSION_LABELS[key])}
    </td>`;
  };
  const rows = [];
  for (let index = 0; index < OFFER_INCLUSION_KEYS.length; index += 2) {
    rows.push(`<tr>${cell(OFFER_INCLUSION_KEYS[index])}${OFFER_INCLUSION_KEYS[index + 1] ? cell(OFFER_INCLUSION_KEYS[index + 1]) : '<td></td>'}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">${rows.join('')}</table>`;
};

/**
 * One offer as a card. Offer shape (built in services/quoteFollowUpService.js):
 * { driverName, driverPhoto, rating, reviewCount, experienceYears, vehicleModel,
 *   vehicleSeats, totalKms, pricePerExtraKm, totalPrice, days, inclusions,
 *   note, viewUrl, label }
 * `expired` greys the card and drops its link.
 */
const renderOfferCard = (offer, { expired = false, button = true } = {}) => {
  const vehicle = [
    offer.vehicleModel ? escapeHtml(offer.vehicleModel) : null,
    offer.vehicleSeats ? `${offer.vehicleSeats} seats` : null,
  ].filter(Boolean).join(', ');
  const perDay = offer.days > 0 && Number.isFinite(offer.totalPrice) ? formatWholeCurrency(offer.totalPrice / offer.days) : '';
  const distance = Number.isFinite(offer.totalKms)
    ? `${offer.totalKms} km included${Number.isFinite(offer.pricePerExtraKm) ? `, then $${Number(offer.pricePerExtraKm).toFixed(2)} per km` : ''}`
    : '';
  const initial = escapeHtml((offer.driverName || 'D').trim().charAt(0).toUpperCase());
  const photo = offer.driverPhoto
    ? `<img src="${offer.driverPhoto}" alt="" width="52" height="52" style="display:block;border:0;width:52px;height:52px;border-radius:26px;" />`
    : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="52" height="52" align="center" bgcolor="#e2e8f0" style="border-radius:26px;font-family:${fontStack};font-size:20px;font-weight:700;color:#475569;">${initial}</td></tr></table>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px 0;border:1px solid #e2e8f0;border-radius:14px;">
    <tr>
      <td style="padding:16px;${expired ? 'opacity:0.7;' : ''}">
        ${
          offer.label
            ? `<div style="margin:0 0 10px 0;font-family:${fontStack};font-size:11px;font-weight:800;letter-spacing:0.08em;color:${brandColor};">${escapeHtml(offer.label.toUpperCase())}</div>`
            : ''
        }
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="64" valign="top">${photo}</td>
            <td valign="top" style="${cellStyles}">
              <div style="font-family:${fontStack};font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(offer.driverName || 'Driver')}</div>
              <div style="font-family:${fontStack};font-size:13px;color:#475569;">${describeDriverFacts(offer)}</div>
              ${vehicle ? `<div style="font-family:${fontStack};font-size:13px;color:#475569;">${vehicle}</div>` : ''}
            </td>
          </tr>
        </table>
        <div style="margin-top:12px;font-family:${fontStack};">
          <span style="font-family:${fontStack};font-size:22px;font-weight:800;color:${expired ? '#94a3b8' : '#0f172a'};${expired ? 'text-decoration:line-through;' : ''}">${formatWholeCurrency(offer.totalPrice)}</span>
          <span style="font-family:${fontStack};font-size:13px;color:#475569;"> total${perDay ? ` &nbsp;&middot;&nbsp; ${perDay} / day` : ''}</span>
        </div>
        ${distance ? `<div style="font-family:${fontStack};font-size:13px;color:#475569;">${distance}</div>` : ''}
        ${renderOfferInclusions(offer.inclusions)}
        ${
          !expired && button && offer.viewUrl
            ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr><td align="center" bgcolor="${brandColor}" style="border-radius:10px;"><a href="${offer.viewUrl}" style="display:inline-block;padding:12px 20px;font-family:${fontStack};font-size:14px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">View offer and chat</a></td></tr></table>`
            : ''
        }
      </td>
    </tr>
  </table>`;
};

const renderOfferCards = (offers, options) => ({ raw: offers.map((offer) => renderOfferCard(offer, options)).join('') });

const describeOfferText = (offer) =>
  `- ${offer.label ? `${offer.label}: ` : ''}${offer.driverName || 'Driver'}, ${formatWholeCurrency(offer.totalPrice)}${
    offer.vehicleModel ? `, ${offer.vehicleModel}` : ''
  }${Number.isFinite(offer.totalKms) ? `, ${offer.totalKms} km included` : ''}${offer.viewUrl ? `\n  ${offer.viewUrl}` : ''}`;

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

const withTextFooter = (text, preferencesUrl) =>
  `${text}\n\nNo booking fee. No deposit. Free cancellation up to 2 days before your trip.${
    preferencesUrl ? `\n\nEmail me less often: ${preferencesUrl}` : ''
  }`;

/** Sent the moment a quote request is posted: says what will happen and when. */
export const sendQuoteRequestReceivedEmail = async ({ traveler, brief, preferencesUrl }) => {
  if (!traveler?.email) {
    return;
  }

  const route = briefRouteLabel(brief);
  const requestsUrl = buildUrl('/dashboard?tab=requests');
  const supportEmail = getSupportEmail();

  const html = buildEmailTemplate({
    title: 'Your trip request is live',
    preheader: 'Drivers are being notified now. Here is what happens next.',
    bodyLines: [
      `Hi ${escapeHtml(traveler.name || 'there')},`,
      `Your request for <strong>${escapeHtml(route)}</strong> (${formatDateRange(brief?.startDate, brief?.endDate)}, ${plural(
        Number(brief?.adults) || 1,
        'adult'
      )}) has gone to approved drivers across Sri Lanka.`,
      '<strong>What happens next</strong>',
      {
        raw: `<ol style="margin:0 0 14px 20px;padding:0;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};">
          <li style="margin-bottom:6px;font-family:${fontStack};">Drivers send you offers, often within the first hour.</li>
          <li style="margin-bottom:6px;font-family:${fontStack};">We email you the first one straight away, then a summary so your inbox stays clear.</li>
          <li style="font-family:${fontStack};">Chat with any driver, compare, and book the one you like.</li>
        </ol>`,
      },
      renderReassurance(),
      `<strong>One quick favour:</strong> add ${supportEmail} to your contacts, or move this email to your main inbox, so the offers reach you.`,
    ],
    action: { label: 'View my request', url: requestsUrl },
    preferencesUrl,
  });

  const text = withTextFooter(
    `Hi ${traveler.name || 'there'},\n\nYour request for ${route} (${formatDateRange(brief?.startDate, brief?.endDate)}) has gone to approved drivers across Sri Lanka.\n\nWhat happens next:\n1. Drivers send you offers, often within the first hour.\n2. We email you the first one straight away, then a summary.\n3. Chat with any driver, compare, and book the one you like.\n\nView your request: ${requestsUrl}`,
    preferencesUrl
  );

  await sendEmail({
    to: traveler.email,
    subject: 'Your Sri Lanka trip request is live',
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

  const route = briefRouteLabel(brief);
  const driverName = offer.driverName || 'A driver';
  const price = formatWholeCurrency(offer.totalPrice);
  const previewFacts = [
    offer.vehicleModel,
    offer.days > 0 ? plural(offer.days, 'day') : null,
    offer.reviewCount > 0 ? `★ ${Number(offer.rating).toFixed(1)} from ${plural(offer.reviewCount, 'review')}` : null,
  ].filter(Boolean).join(' · ');

  const html = buildEmailTemplate({
    title: 'Your first offer is in',
    preheader: escapeHtml(`${previewFacts}${previewFacts ? '. ' : ''}More drivers are replying.`),
    bodyLines: [
      `Hi ${escapeHtml(traveler.name || 'there')},`,
      `${escapeHtml(driverName)} has sent the first offer for your <strong>${escapeHtml(route)}</strong> trip. More drivers usually reply over the next few hours, and we will send you a summary so your inbox doesn't fill up.`,
      renderOfferCards([offer], { button: false }),
      offer.note
        ? { raw: `<blockquote style="margin:0 0 16px 0;padding:12px 16px;border-left:4px solid ${brandColor};background:#f1f5f9;border-radius:12px;color:#0f172a;font-size:14px;line-height:1.6;font-family:${fontStack};">${formatMultiline(offer.note)}</blockquote>` }
        : null,
      replyTo
        ? `Reply to this email to ask ${escapeHtml(driverName)} a question. Your reply goes straight to the chat.`
        : null,
      renderReassurance(),
    ],
    action: offer.viewUrl ? { label: 'View offer and chat', url: offer.viewUrl } : null,
    replyable: Boolean(replyTo),
    preferencesUrl,
  });

  const text = withTextFooter(
    `Hi ${traveler.name || 'there'},\n\n${driverName} has sent the first offer for your ${route} trip: ${price}${
      offer.vehicleModel ? `, ${offer.vehicleModel}` : ''
    }${Number.isFinite(offer.totalKms) ? `, ${offer.totalKms} km included` : ''}.\n${offer.note ? `\n${offer.note}\n` : ''}\nView the offer: ${offer.viewUrl || buildUrl('/dashboard?tab=messages')}`,
    preferencesUrl
  );

  await sendEmail({
    to: traveler.email,
    subject: `${driverName}: ${price} for your ${route} trip`,
    html,
    text,
    replyTo,
    senderName: `${driverName} via ${getBrandName()}`,
    headers: listUnsubscribeHeaders(preferencesUrl),
    tags: [EMAIL_TAGS.FIRST_OFFER],
  });
};

const DIGEST_VARIANTS = {
  // A few hours after the first offer: our picks out of everything received.
  digest1: {
    tag: EMAIL_TAGS.DIGEST,
    subject: ({ total, route, shown }) =>
      total > shown ? `${total} drivers replied — our top ${shown} picks for ${route}` : `${plural(total, 'driver')} replied to your ${route} request`,
    title: ({ total }) => (total === 1 ? 'A driver wants to show you Sri Lanka' : `${total} drivers want to show you Sri Lanka`),
    intro: ({ total, shown, route, dates }) =>
      total > shown
        ? `${total} drivers have offered to take you on your <strong>${route}</strong> trip (${dates}). To save you comparing them all, here are the ${shown} we would look at first.`
        : `${total === 1 ? 'A driver has' : `${total} drivers have`} offered to take you on your <strong>${route}</strong> trip (${dates}).`,
    outro: 'Not sure which to choose? Reply to this email with your questions and our team in Sri Lanka will help you decide.',
    helpByReply: true,
  },
  // At most once a day: offers that arrived since we last wrote.
  update: {
    tag: EMAIL_TAGS.UPDATE,
    subject: ({ fresh, route }) => `${plural(fresh, 'new offer')} for your ${route} trip`,
    title: ({ fresh }) => `${plural(fresh, 'new offer')} since we last wrote`,
    intro: ({ fresh, total, route }) =>
      `${fresh === 1 ? 'Another driver has' : `${fresh} more drivers have`} sent an offer for your <strong>${route}</strong> trip. You now have ${plural(total, 'offer')} you can book.`,
    outro: 'Not sure which to choose? Reply to this email with your questions and our team in Sri Lanka will help you decide.',
    helpByReply: true,
  },
  // Three days on: ask what is in the way.
  digest2: {
    tag: EMAIL_TAGS.STILL_DECIDING,
    subject: ({ route }) => `Still planning your ${route} trip?`,
    title: () => 'Still planning your trip?',
    intro: ({ total, route }) =>
      `Your request for <strong>${route}</strong> has ${plural(total, 'offer')} you can still book. If something is in the way, tell us and we will stop guessing.`,
    outro: 'Any questions before you decide? Reply to this email and our team in Sri Lanka will help.',
    helpByReply: true,
    askWhy: true,
  },
  // 30 and 14 days before the start date.
  approaching: {
    tag: EMAIL_TAGS.APPROACHING,
    subject: ({ daysToTrip }) => `Your trip is in ${daysToTrip} days — your driver isn't booked yet`,
    title: ({ daysToTrip }) => `${daysToTrip} days to go, and no driver booked yet`,
    intro: ({ total, route, dates }) =>
      `Your <strong>${route}</strong> trip starts on ${dates.split(' — ')[0]}. You have ${plural(total, 'offer')} waiting, and booking one takes a minute.`,
    outro: 'Any questions before you decide? Reply to this email and our team in Sri Lanka will help.',
    helpByReply: true,
  },
  // A day before the first bookable offer lapses.
  expiring: {
    tag: EMAIL_TAGS.EXPIRING,
    subject: ({ lead }) => `${lead.driverName || 'Your driver'}'s ${formatWholeCurrency(lead.totalPrice)} offer expires tomorrow`,
    title: () => 'An offer expires tomorrow',
    intro: ({ lead, route }) =>
      `${escapeHtml(lead.driverName || 'Your driver')}'s ${formatWholeCurrency(lead.totalPrice)} offer for your <strong>${route}</strong> trip expires within a day. After that they would need to send a new one, and the price may change.`,
    outro: 'Any questions before you decide? Reply to this email and our team in Sri Lanka will help.',
    helpByReply: true,
  },
};

const WHY_ANSWERS = [
  { key: 'price', label: 'Prices are higher than I expected' },
  { key: 'dates', label: "I haven't fixed my dates" },
  { key: 'choice', label: "I can't choose a driver" },
  { key: 'booked', label: "I've booked something else" },
];

const renderWhyQuestion = (answerUrls = {}) => {
  const buttons = WHY_ANSWERS.filter((answer) => answerUrls[answer.key])
    .map(
      (answer) =>
        `<tr><td style="padding:0 0 8px 0;"><a href="${answerUrls[answer.key]}" style="display:block;padding:12px 16px;border:1px solid #cbd5e1;border-radius:10px;font-family:${fontStack};font-size:14px;font-weight:600;line-height:20px;color:#0f172a;text-decoration:none;">${escapeHtml(answer.label)}</a></td></tr>`
    )
    .join('');
  if (!buttons) return null;
  return {
    raw: `<p style="${paragraphStyles}font-weight:700;">What's holding you back?</p>
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

  const copy = DIGEST_VARIANTS[variant] || DIGEST_VARIANTS.digest1;
  const total = Number.isFinite(totalCount) ? totalCount : offers.length;
  const dashboardUrl = buildUrl('/dashboard?tab=messages');
  const startMonth = brief?.startDate ? new Date(brief.startDate).getUTCMonth() : -1;
  const context = {
    total,
    shown: offers.length,
    fresh: freshCount || offers.length,
    route: escapeHtml(briefRouteLabel(brief)),
    dates: formatDateRange(brief?.startDate, brief?.endDate),
    lead: leadOffer || offers[0],
    daysToTrip,
  };
  const lowest = formatWholeCurrency(Math.min(...offers.map((offer) => Number(offer.totalPrice) || Infinity)));

  const html = buildEmailTemplate({
    title: copy.title(context),
    preheader: escapeHtml(`${lowest ? `From ${lowest}. ` : ''}No booking fee, pay your driver on day one.`),
    bodyLines: [
      `Hi ${escapeHtml(traveler.name || 'there')},`,
      copy.intro(context),
      // December and January are Sri Lanka's peak months.
      variant === 'expiring' && (startMonth === 11 || startMonth === 0)
        ? 'Your dates fall in peak season, when drivers fill their calendars early.'
        : null,
      copy.askWhy ? renderWhyQuestion(answerUrls) : null,
      renderOfferCards(offers),
      total > offers.length
        ? `<a href="${dashboardUrl}" style="font-family:${fontStack};color:${brandColor};font-weight:700;">See all ${total} offers</a>`
        : null,
      renderReassurance(),
      replyTo ? copy.outro : null,
    ],
    action: { label: total > 1 ? `Compare all ${total} offers` : 'Open your offer', url: dashboardUrl },
    replyable: replyTo ? 'support' : false,
    preferencesUrl,
  });

  const plainContext = { ...context, route: briefRouteLabel(brief) };
  const text = withTextFooter(
    `Hi ${traveler.name || 'there'},\n\n${copy.title(plainContext)}\n\n${offers.map(describeOfferText).join('\n')}\n\nCompare and book in your dashboard: ${dashboardUrl}`,
    preferencesUrl
  );

  await sendEmail({
    to: traveler.email,
    subject: copy.subject(plainContext),
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

  const route = briefRouteLabel(brief);
  const dashboardUrl = buildUrl('/dashboard?tab=messages');

  const html = buildEmailTemplate({
    title: 'Your offers have expired',
    preheader: escapeHtml(`Get fresh prices for ${route} in one step.`),
    bodyLines: [
      `Hi ${escapeHtml(traveler.name || 'there')},`,
      `The offers drivers sent for your <strong>${escapeHtml(route)}</strong> trip (${formatDateRange(
        brief?.startDate,
        brief?.endDate
      )}) have expired, so they can no longer be booked as they are.`,
      repostUrl
        ? 'Still planning this trip? Post the same request again and drivers will send you up-to-date prices. You do not need to fill anything in.'
        : 'Still planning this trip? Open the conversation with any driver below and tap <strong>Request new offer</strong>.',
      repostUrl
        ? `Prefer one of the drivers below? Open your <a href="${dashboardUrl}" style="font-family:${fontStack};color:${brandColor};font-weight:700;">messages</a> and tap <strong>Request new offer</strong> in their chat.`
        : null,
      offers.length > 0 ? renderOfferCards(offers, { expired: true }) : null,
    ],
    action: repostUrl ? { label: 'Post this request again', url: repostUrl } : { label: 'Request new offers', url: dashboardUrl },
    preferencesUrl,
  });

  const text = withTextFooter(
    `Hi ${traveler.name || 'there'},\n\nThe offers for your ${route} trip have expired.\n\n${
      repostUrl ? `Post the same request again: ${repostUrl}\n\n` : ''
    }Or ask a driver for a new offer in your messages: ${dashboardUrl}`,
    preferencesUrl
  );

  await sendEmail({
    to: traveler.email,
    subject: `Your offers for ${route} have expired`,
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

  const route = briefRouteLabel(brief);
  const requestsUrl = buildUrl('/dashboard?tab=requests');
  const whatsApp = getWhatsAppNumber();

  const html = buildEmailTemplate({
    title: 'Still waiting on your first offer',
    preheader: 'Some routes and dates take longer. Here is what can help.',
    bodyLines: [
      `Hi ${escapeHtml(traveler.name || 'there')},`,
      `No driver has sent an offer yet for your <strong>${escapeHtml(route)}</strong> trip (${formatDateRange(brief?.startDate, brief?.endDate)}). Some routes and dates take longer, and your request stays open to every approved driver.`,
      '<strong>Two things that usually help</strong>',
      {
        raw: `<ul style="margin:0 0 14px 20px;padding:0;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};">
          <li style="margin-bottom:6px;font-family:${fontStack};">Add detail: the places you want to visit, your group size and luggage, and whether your dates are flexible.</li>
          <li style="font-family:${fontStack};">Message us on WhatsApp at ${escapeHtml(whatsApp)} and we will point drivers to your request.</li>
        </ul>`,
      },
      'We will email you as soon as the first offer arrives.',
    ],
    action: { label: 'View my request', url: requestsUrl },
    replyable: 'support',
    preferencesUrl,
  });

  const text = withTextFooter(
    `Hi ${traveler.name || 'there'},\n\nNo driver has sent an offer yet for your ${route} trip. Some routes and dates take longer, and your request stays open.\n\nIt helps to add detail to your request, or message us on WhatsApp at ${whatsApp}.\n\nView your request: ${requestsUrl}`,
    preferencesUrl
  );

  await sendEmail({
    to: traveler.email,
    subject: `No offers yet for your ${route} trip — here is what helps`,
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

  const first = offers[0];
  const firstDriver = first.driverName || 'your driver';
  const rows = offers
    .map(
      (offer) => `<tr>
        <td style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;${cellStyles}">
          <strong style="font-family:${fontStack};">${escapeHtml(offer.driverName || 'Driver')}</strong> &middot; ${formatWholeCurrency(offer.totalPrice)}
          <div style="font-family:${fontStack};font-size:13px;color:#475569;">${[offer.vehicleModel ? escapeHtml(offer.vehicleModel) : null, offer.startDate ? `from ${formatDate(offer.startDate)}` : null].filter(Boolean).join(' &middot; ')}</div>
          ${offer.viewUrl ? `<a href="${offer.viewUrl}" style="font-family:${fontStack};font-size:13px;font-weight:700;color:${brandColor};">View offer</a>` : ''}
        </td>
      </tr><tr><td height="8" style="font-size:0;line-height:0;">&nbsp;</td></tr>`
    )
    .join('');

  const html = buildEmailTemplate({
    title: offers.length === 1 ? 'Your offer is still open' : `${offers.length} offers are still open`,
    preheader: escapeHtml(`${formatWholeCurrency(first.totalPrice)}${first.vehicleModel ? ` · ${first.vehicleModel}` : ''}. No booking fee, no deposit.`),
    bodyLines: [
      `Hi ${escapeHtml(recipient.name || 'there')},`,
      offers.length === 1
        ? `${escapeHtml(firstDriver)} sent you an offer you have not opened yet.`
        : `You have ${offers.length} offers you have not opened yet.`,
      { raw: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;">${rows}</table>` },
      renderReassurance(),
    ],
    action: { label: offers.length === 1 ? 'View offer' : 'View my offers', url: offers.length === 1 && first.viewUrl ? first.viewUrl : buildUrl('/dashboard?tab=messages') },
    preferencesUrl,
  });

  const text = withTextFooter(
    `Hi ${recipient.name || 'there'},\n\n${offers.length === 1 ? `${firstDriver} sent you an offer you have not opened yet.` : `You have ${offers.length} offers you have not opened yet.`}\n\n${offers.map(describeOfferText).join('\n')}`,
    preferencesUrl
  );

  await sendEmail({
    to: recipient.email,
    subject:
      offers.length === 1
        ? `${firstDriver}'s ${formatWholeCurrency(first.totalPrice)} offer${first.startDate ? ` for ${formatDate(first.startDate)}` : ''} is still open`
        : `${offers.length} offers are still waiting for you`,
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

  const driverName = driver?.name || 'Your driver';
  const dashboardUrl = buildUrl('/dashboard?tab=bookings');

  const html = buildEmailTemplate({
    title: `Your trip starts on ${formatDate(booking?.startDate)}`,
    preheader: escapeHtml(`${driverName} will meet you${booking?.startPoint ? ` at ${booking.startPoint}` : ''}. Here is what to have ready.`),
    bodyLines: [
      `Hi ${escapeHtml(traveler.name || 'there')},`,
      `Your trip with <strong>${escapeHtml(driverName)}</strong> is three days away.`,
      `<strong>Dates:</strong> ${formatDateRange(booking?.startDate, booking?.endDate)}`,
      booking?.startPoint ? `<strong>Pick-up:</strong> ${escapeHtml(booking.startPoint)}` : null,
      vehicle?.model ? `<strong>Vehicle:</strong> ${escapeHtml(vehicle.model)}` : null,
      driver?.contactNumber ? `<strong>Driver's phone:</strong> ${escapeHtml(driver.contactNumber)}` : null,
      `<strong>Total:</strong> ${formatCurrency(booking?.payableTotal > 0 ? booking.payableTotal : booking?.totalPrice)}, paid to your driver on day one`,
      '<strong>Have ready</strong>',
      {
        raw: `<ul style="margin:0 0 14px 20px;padding:0;color:#0f172a;font-size:15px;line-height:1.6;font-family:${fontStack};">
          <li style="margin-bottom:6px;font-family:${fontStack};">${booking?.flightNumber ? `Your flight number (${escapeHtml(booking.flightNumber)}) is on the booking. Tell your driver if it changes.` : 'Your flight number and arrival time, sent to your driver in the chat.'}</li>
          <li style="margin-bottom:6px;font-family:${fontStack};">The payment for your driver, as you agreed with them.</li>
          <li style="font-family:${fontStack};">Your pick-up time and exact meeting point, confirmed with your driver.</li>
        </ul>`,
      },
      'Plans changed? Cancelling more than 2 days before your start date is free. Within 2 days, 50% of the total is due to the driver.',
    ],
    action: { label: 'View my booking', url: dashboardUrl },
  });

  const text = `Hi ${traveler.name || 'there'},\n\nYour trip with ${driverName} starts on ${formatDate(booking?.startDate)}.\n${
    booking?.startPoint ? `Pick-up: ${booking.startPoint}\n` : ''
  }${driver?.contactNumber ? `Driver's phone: ${driver.contactNumber}\n` : ''}\nView your booking: ${dashboardUrl}`;

  await sendEmail({
    to: traveler.email,
    subject: `In 3 days: ${driverName} meets you${booking?.startPoint ? ` at ${booking.startPoint}` : ''}`,
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

const CANCELLATION_POLICY_LINES = [
  'More than 2 days before your start date: free to cancel, nothing to pay.',
  'Within 2 days of the start date: 50% of the total is due to the driver.',
  'After the trip has started: the completed days in full, plus 50% of the remaining days.',
];

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

  const confirmed = booking?.status === 'confirmed';
  const vehicleModel = vehicle?.model || 'a vehicle';
  const driverName = driver?.name || 'your driver';
  const dashboardUrl = buildUrl('/dashboard?tab=bookings');
  const calendarUrl = confirmed
    ? googleCalendarUrl({
        title: `Sri Lanka trip with ${driverName}`,
        startDate: booking?.startDate,
        endDate: booking?.endDate,
        location: booking?.startPoint,
        details: `${vehicleModel}. Booked on ${getBrandName()}: ${dashboardUrl}`,
      })
    : '';

  const confirmedLines = [
    `Your booking is confirmed. <strong>${escapeHtml(driverName)}</strong> has been notified and will meet you${
      booking?.startPoint ? ` at ${escapeHtml(booking.startPoint)}` : ''
    } on ${formatDate(booking?.startDate)}.`,
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
                  ${driver?.contactNumber ? `<div style="font-family:${fontStack};font-size:14px;color:#0f172a;"><strong style="font-family:${fontStack};">Phone:</strong> ${escapeHtml(driver.contactNumber)}</div>` : ''}
                </td>
              </tr>
            </table>
            <div style="margin-top:12px;font-family:${fontStack};font-size:14px;line-height:1.6;color:#0f172a;">
              <strong style="font-family:${fontStack};">Dates:</strong> ${formatDateRange(booking?.startDate, booking?.endDate)}<br />
              <strong style="font-family:${fontStack};">Total:</strong> ${formatCurrency(booking?.payableTotal > 0 ? booking.payableTotal : booking?.totalPrice)}
            </div>
            ${renderOfferInclusions(inclusions)}
          </td>
        </tr>
      </table>`,
    },
    paymentNote ? formatMultiline(paymentNote) : null,
    'Send your driver your flight number and arrival time in the chat, so they can plan your pick-up.',
    '<strong>If your plans change</strong>',
    {
      raw: `<ul style="margin:0 0 14px 20px;padding:0;color:#0f172a;font-size:14px;line-height:1.6;font-family:${fontStack};">${CANCELLATION_POLICY_LINES.map(
        (line) => `<li style="margin-bottom:4px;font-family:${fontStack};">${line}</li>`
      ).join('')}</ul>`,
    },
    calendarUrl
      ? `<a href="${calendarUrl}" style="font-family:${fontStack};color:${brandColor};font-weight:700;">Add this trip to Google Calendar</a>`
      : null,
  ];

  const pendingLines = [
    `We've sent your request for ${escapeHtml(vehicleModel)} to the driver.`,
    `<strong>Trip dates:</strong> ${formatDateRange(booking?.startDate, booking?.endDate)}`,
    `<strong>Total estimate:</strong> ${formatCurrency(booking?.totalPrice)}`,
    `<strong>Status:</strong> ${formatStatus(booking?.status)}`,
    paymentNote ? formatMultiline(paymentNote) : null,
    'You will get an email when the driver accepts or updates the request.',
  ];

  const html = buildEmailTemplate({
    title: confirmed ? 'Your trip is booked' : 'Booking request received',
    preheader: confirmed
      ? escapeHtml(`${driverName}'s details, what is included and how to cancel.`)
      : `We shared your request for ${escapeHtml(vehicleModel)}.`,
    bodyLines: [`Hi ${escapeHtml(traveler.name || 'there')},`, ...(confirmed ? confirmedLines : pendingLines)],
    action: {
      label: 'View booking',
      url: dashboardUrl,
    },
  });

  const text = `Hi ${traveler.name || 'there'},\n\n${
    confirmed
      ? `Your booking with ${driverName} (${vehicleModel}) is confirmed.${driver?.contactNumber ? `\nDriver's phone: ${driver.contactNumber}` : ''}`
      : `We sent your booking request for ${vehicleModel}.`
  }\nDates: ${formatDateRange(booking?.startDate, booking?.endDate)}\nTotal: ${formatCurrency(
    booking?.totalPrice
  )}\nStatus: ${formatStatus(booking?.status)}${
    confirmed ? `\n\nCancellation:\n${CANCELLATION_POLICY_LINES.map((line) => `- ${line}`).join('\n')}` : ''
  }\n\nView your booking: ${dashboardUrl}`;

  await sendEmail({
    to: traveler.email,
    subject: confirmed
      ? `Booked: ${driverName} will meet you on ${formatDate(booking?.startDate)}`
      : `We received your booking request for ${vehicleModel}`,
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
  const statusLabel = formatStatus(status || booking?.status);
  const title =
    statusLabel === 'Confirmed'
      ? 'Your trip is confirmed'
      : statusLabel === 'Rejected'
        ? 'Booking was declined'
        : statusLabel === 'Cancelled'
          ? 'Booking cancelled'
          : 'Booking updated';

  const html = buildEmailTemplate({
    title,
    preheader: `${vehicle?.model || 'Your booking'} is now ${statusLabel.toLowerCase()}.`,
    bodyLines: [
      `Hi ${escapeHtml(recipient.name || 'there')},`,
      `${vehicle?.model || 'The booking'} is now <strong>${statusLabel}</strong>.`,
      `<strong>Trip dates:</strong> ${formatDateRange(booking?.startDate, booking?.endDate)}`,
      `<strong>Total:</strong> ${formatCurrency(booking?.totalPrice)}`,
      note ? formatMultiline(note) : null,
      'Open the conversation if you need to follow up.',
    ],
    action: {
      label: role === 'driver' ? 'Open driver portal' : 'View booking',
      url: role === 'driver' ? buildUrl('/portal/driver/messages') : buildUrl('/dashboard'),
    },
  });

  const text = `Hi ${recipient.name || 'there'},\n\n${
    vehicle?.model || 'Your booking'
  } is now ${statusLabel}.\nDates: ${formatDateRange(booking?.startDate, booking?.endDate)}\nTotal: ${formatCurrency(
    booking?.totalPrice
  )}\n${note || ''}\n\nVisit your ${
    role === 'driver' ? 'driver portal' : 'dashboard'
  } to review details.`;

  await sendEmail({
    to: recipient.email,
    subject: `${vehicle?.model || 'Booking'} updated: ${statusLabel}`,
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

export const sendReviewRequestEmail = async ({ to, travelerName, driverName, vehicleModel, tripDates, reviewUrl }) => {
  const safeName = escapeHtml(travelerName || 'there');
  const safeDriver = escapeHtml(driverName || 'your driver');
  const safeVehicle = escapeHtml(vehicleModel || 'your vehicle');
  const safeDates = escapeHtml(tripDates || '');
  const brandName = getBrandName();

  const html = buildEmailTemplate({
    title: `How was your trip with ${safeDriver}?`,
    preheader: `Tell other travellers about your trip with ${safeDriver}`,
    bodyLines: [
      `Hi ${safeName},`,
      `We hope you enjoyed your trip with ${safeDriver}${safeDates ? ` (${safeDates})` : ''} in the ${safeVehicle}.`,
      'Would you take a minute to rate your driver? Your review helps other travellers choose with confidence, and it means a great deal to your driver.',
      'You do not need to sign in — the button below opens your review form directly.',
    ],
    action: {
      label: 'Leave a review',
      url: reviewUrl,
    },
  });

  const text = `Hi ${travelerName || 'there'},\n\nWe hope you enjoyed your trip with ${driverName || 'your driver'}${tripDates ? ` (${tripDates})` : ''}.\n\nLeave a review here: ${reviewUrl}\n\nThank you for choosing ${brandName}.`;

  await sendEmail({
    to,
    subject: `How was your trip with ${driverName || 'your driver'}?`,
    html,
    text,
  });
};

