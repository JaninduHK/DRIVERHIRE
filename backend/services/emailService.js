import { Resend } from 'resend';

let resendClient;

const brandName = process.env.APP_BRAND_NAME || 'Car With Driver';
const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
const emailFrom = process.env.EMAIL_FROM || `${brandName} <no-reply@example.com>`;
const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || 'support@example.com';
const currencyCode = process.env.APP_CURRENCY || 'USD';

const paragraphStyles =
  'margin:0 0 14px 0;color:#0f172a;font-size:15px;line-height:1.6;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;';
const footerStyles =
  'margin:0 0 6px 0;color:#94a3b8;font-size:13px;line-height:1.6;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;';

const defaultFooterLines = [
  `Need help? Reply to this email or reach us at ${supportEmail}.`,
  `You are receiving this email because you have an active account on ${brandName}.`,
  `© ${new Date().getFullYear()} ${brandName}`,
];

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
    currency: currencyCode,
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

const buildEmailTemplate = ({ title, preheader, bodyLines = [], action, footerLines = [] }) => `
  <div style="background-color:#e2e8f0;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;">
      ${
        preheader
          ? `<p style="${footerStyles}margin-bottom:16px;">${preheader}</p>`
          : ''
      }
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">
        ${title}
      </h1>
      ${renderParagraphs(bodyLines)}
      ${
        action
          ? `<div style="margin:32px 0;">
              <a href="${action.url}" style="display:inline-block;background-color:#0f172a;color:#ffffff;padding:12px 22px;border-radius:10px;font-weight:600;text-decoration:none;">
                ${action.label}
              </a>
            </div>`
          : ''
      }
      ${renderFooter([...footerLines, ...defaultFooterLines])}
    </div>
  </div>
`;

const getResendClient = () => {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
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
  const message = reason || 'Unable to send email via Resend.';
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

const sendEmail = async ({ to, subject, html, text }) => {
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

  const client = getResendClient();

  if (!client) {
    logEmailResult(payload, 'SKIPPED', { reason: 'RESEND_API_KEY missing' });
    logEmailPreview(payload, 'RESEND_API_KEY missing. Logging the email preview instead.');
    return;
  }

  try {
    await client.emails.send({
      from: emailFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    logEmailResult(payload, 'SENT');
  } catch (error) {
    console.error('[email] Resend API error:', error.message || error);
    if (error?.response?.data) {
      console.error('[email] Resend response:', JSON.stringify(error.response.data, null, 2));
    }
    logEmailResult(payload, 'FAILED', { error: error.message || 'Unknown error' });
    logEmailPreview(payload, 'Resend send failed. Logged preview for debugging.');
  }
};

export const sendDriverAdminMessageEmail = async ({ driver, subject, message, sender }) => {
  if (!driver?.email || !message) {
    return;
  }

  const safeDriverName = escapeHtml(driver.name || 'there');
  const adminName = escapeHtml(sender?.name || 'Admin team');
  const adminEmail = sender?.email ? ` (${escapeHtml(sender.email)})` : '';
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

export const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const safeName = escapeHtml(name || 'there');
  const url = verificationUrl || buildUrl('/verify-email');
  const html = buildEmailTemplate({
    title: 'Verify your email address',
    preheader: `Confirm your email to activate your ${brandName} account`,
    bodyLines: [
      `Hi ${safeName},`,
      `Thanks for registering with ${brandName}. Please confirm your email address to activate your account.`,
      'For security reasons this link expires in 24 hours.',
      {
        raw: `<p style="${paragraphStyles}"><strong>Verification link:</strong> <a href="${url}">${url}</a></p>`,
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

export const sendConversationNotificationEmail = async ({
  recipient,
  sender,
  messagePreview,
  conversationUrl,
  isOffer = false,
  vehicleModel,
}) => {
  if (!recipient?.email) {
    return;
  }

  const recipientName = escapeHtml(recipient.name || 'there');
  const senderName = escapeHtml(sender?.name || 'your contact');
  const preview = messagePreview ? formatMultiline(messagePreview) : '';

  const subject = isOffer
    ? `${senderName} sent you a trip offer`
    : `New message from ${senderName}`;

  const lines = [
    `Hi ${recipientName},`,
    `${senderName} ${
      isOffer ? 'shared a trip offer' : 'sent you a new message'
    }${vehicleModel ? ` about ${escapeHtml(vehicleModel)}` : ''} on ${brandName}.`,
  ];

  if (preview) {
    lines.push({
      raw: `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #0f172a;background:#f1f5f9;border-radius:12px;color:#0f172a;font-size:15px;line-height:1.6;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">${preview}</blockquote>`,
    });
  }

  lines.push('Reply from your dashboard to keep the conversation moving.');

  const html = buildEmailTemplate({
    title: isOffer ? 'New trip offer' : 'New message waiting',
    preheader: `${senderName} ${isOffer ? 'shared a trip offer' : 'sent you a message'} on ${brandName}`,
    bodyLines: lines,
    action: {
      label: 'Open conversation',
      url: conversationUrl || (recipient?.role === 'driver' ? buildUrl('/portal/driver/messages') : buildUrl('/dashboard')),
    },
  });

  const text = `Hi ${recipient.name || 'there'},\n\n${sender?.name || 'Your contact'} ${
    isOffer ? 'sent you a trip offer' : 'sent you a new message'
  }.\n\n${messagePreview || ''}\n\nOpen your ${
    recipient?.role === 'driver' ? 'driver portal' : 'dashboard'
  } to reply.`;

  await sendEmail({
    to: recipient.email,
    subject,
    html,
    text,
  });
};

export const sendBookingRequestConfirmationEmail = async ({
  traveler,
  booking,
  vehicle,
  paymentNote,
}) => {
  if (!traveler?.email) {
    return;
  }

  const html = buildEmailTemplate({
    title: 'Booking request received',
    preheader: `We shared your request for ${vehicle?.model || 'a vehicle'}.`,
    bodyLines: [
      `Hi ${escapeHtml(traveler.name || 'there')},`,
      `We've sent your request for ${escapeHtml(vehicle?.model || 'a vehicle')} to the driver.`,
      `<strong>Trip dates:</strong> ${formatDateRange(booking?.startDate, booking?.endDate)}`,
      `<strong>Total estimate:</strong> ${formatCurrency(booking?.totalPrice)}`,
      `<strong>Status:</strong> ${formatStatus(booking?.status)}`,
      paymentNote ? formatMultiline(paymentNote) : null,
      'You will get an email when the driver accepts or updates the request.',
    ],
    action: {
      label: 'View booking',
      url: buildUrl('/dashboard'),
    },
  });

  const text = `Hi ${traveler.name || 'there'},\n\nWe sent your booking request for ${
    vehicle?.model || 'a vehicle'
  }.\nDates: ${formatDateRange(booking?.startDate, booking?.endDate)}\nTotal: ${formatCurrency(
    booking?.totalPrice
  )}\nStatus: ${formatStatus(booking?.status)}\n\nCheck your dashboard for updates.`;

  await sendEmail({
    to: traveler.email,
    subject: `We received your booking request for ${vehicle?.model || 'a vehicle'}`,
    html,
    text,
  });
};

export const sendBookingRequestAlertEmail = async ({ driver, traveler, booking, vehicle }) => {
  if (!driver?.email) {
    return;
  }

  const html = buildEmailTemplate({
    title: 'New booking request waiting',
    preheader: `${escapeHtml(traveler?.name || 'A traveller')} requested ${escapeHtml(
      vehicle?.model || 'your vehicle'
    )}.`,
    bodyLines: [
      `Hi ${escapeHtml(driver.name || 'there')},`,
      `${escapeHtml(traveler?.name || 'A traveller')} just requested ${escapeHtml(
        vehicle?.model || 'your vehicle'
      )}.`,
      `<strong>Dates:</strong> ${formatDateRange(booking?.startDate, booking?.endDate)}`,
      `<strong>Estimated total:</strong> ${formatCurrency(booking?.totalPrice)}`,
      `<strong>Traveller email:</strong> ${escapeHtml(traveler?.email || '—')}`,
      'Reply in your driver portal to accept, reject, or ask follow-up questions.',
    ],
    action: {
      label: 'Review booking',
      url: buildUrl('/portal/driver/messages'),
    },
  });

  const text = `Hi ${driver.name || 'there'},\n\n${
    traveler?.name || 'A traveller'
  } requested ${vehicle?.model || 'your vehicle'}.\nDates: ${formatDateRange(
    booking?.startDate,
    booking?.endDate
  )}\nTotal: ${formatCurrency(booking?.totalPrice)}\nTraveller email: ${traveler?.email || '—'}\n\nOpen your driver portal to respond.`;

  await sendEmail({
    to: driver.email,
    subject: `New booking request for ${vehicle?.model || 'your vehicle'}`,
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
