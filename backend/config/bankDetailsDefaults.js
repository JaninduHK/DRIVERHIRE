// Fallback bank details used until an admin saves real values via /api/admin/settings.
export const DEFAULT_BANK_DETAILS = {
  accountName: process.env.PLATFORM_BANK_ACCOUNT_NAME || 'Car With Driver Operations',
  accountNumber: process.env.PLATFORM_BANK_ACCOUNT_NUMBER || '0001234567',
  bankName: process.env.PLATFORM_BANK_NAME || 'National Bank of Sri Lanka',
  branch: process.env.PLATFORM_BANK_BRANCH || 'Colombo HQ',
  swiftCode: process.env.PLATFORM_BANK_SWIFT || '',
  referenceNote:
    process.env.PLATFORM_BANK_REFERENCE ||
    'Use your Car With Driver ID and the commission month as the payment reference.',
};
