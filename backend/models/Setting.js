import mongoose from 'mongoose';

// Simple key/value store for admin-configurable platform settings.
export const SETTING_KEYS = {
  DRIVER_AUTO_APPROVAL: 'driverAutoApproval',
  PLATFORM_BANK_DETAILS: 'platformBankDetails',
};

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
