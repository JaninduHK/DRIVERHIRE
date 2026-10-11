import mongoose from 'mongoose';

// Simple key/value store for admin-configurable platform settings.
export const SETTING_KEYS = {
  DRIVER_AUTO_APPROVAL: 'driverAutoApproval',
  PLATFORM_BANK_DETAILS: 'platformBankDetails',
  REVIEW_REQUESTS_START_AT: 'reviewRequestsStartAt',
  // Admin switch for the driver-type selector on the public quote form.
  BRIEF_DRIVER_TYPE_SELECTION: 'briefDriverTypeSelection',
  // Which approved drivers get the "new traveller brief" email (see BRIEF_ALERT_EMAIL_MODES).
  BRIEF_ALERT_EMAILS: 'briefAlertEmails',
  // Master switch for traveller follow-up emails about unbooked quote requests
  // (services/quoteFollowUpService.js). On unless explicitly set to false.
  QUOTE_FOLLOW_UPS: 'quoteFollowUps',
};

// Every new brief emails every approved driver, which is by far the largest
// share of outgoing mail and can exhaust the mail provider's daily quota —
// starving verification and offer emails. Push notifications are unaffected.
export const BRIEF_ALERT_EMAIL_MODES = {
  ALL: 'all', // every approved driver
  WITHOUT_APP: 'without-app', // only drivers with no mobile app installed (the rest get the push)
  OFF: 'off', // nobody
};

export const normalizeBriefAlertEmailMode = (value) =>
  Object.values(BRIEF_ALERT_EMAIL_MODES).includes(value) ? value : BRIEF_ALERT_EMAIL_MODES.ALL;

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const Setting = mongoose.model('Setting', settingSchema);

// Read a setting's value, falling back to a default when unset.
export const getSetting = async (key, defaultValue = null) => {
  const doc = await Setting.findOne({ key }).lean();
  return doc && doc.value !== undefined && doc.value !== null ? doc.value : defaultValue;
};

// Create or update a setting.
export const setSetting = async (key, value) => {
  const doc = await Setting.findOneAndUpdate(
    { key },
    { $set: { value } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.value;
};

export default Setting;
