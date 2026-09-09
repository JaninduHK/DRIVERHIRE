import { getLicenseBadge } from '../constants/driverLicense.js';

// Icon-only badge, for the spot next to a driver's name. Renders nothing when
// the driver has no approved license.
export const LicenseIconBadge = ({ licenseType, className = 'h-[18px] w-[18px] p-1' }) => {
  const badge = getLicenseBadge(licenseType);
  if (!badge) return null;
  const Icon = badge.icon;
  return (
    <span className={`inline-flex flex-shrink-0 items-center justify-center rounded-full ${badge.badgeClass} ${className}`}>
      <Icon className={`h-full w-full ${badge.iconClass}`} strokeWidth={2.4} />
    </span>
  );
};

// Icon + license type text, for the grid card's location-line replacement.
export const LicenseTypeChip = ({ licenseType, className = '' }) => {
  const badge = getLicenseBadge(licenseType);
  if (!badge) return null;
  const Icon = badge.icon;
  return (
    <span className={`mt-[3px] inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11.5px] font-bold ${badge.badgeClass} ${className}`}>
      <Icon className={`h-3 w-3 ${badge.iconClass}`} strokeWidth={2.4} />
      {licenseType}
    </span>
  );
};
