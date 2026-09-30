import { BadgeCheck, Crown } from 'lucide-react';

export const LICENSE_BADGE_STYLES = {
  'Tourist Driver': {
    icon: BadgeCheck,
    badgeClass: 'bg-blue-50 text-blue-700',
    iconClass: 'text-blue-600',
  },
  'Chauffeur Guide Lecturer': {
    icon: Crown,
    badgeClass: 'bg-amber-50 text-amber-700',
    iconClass: 'text-amber-600',
  },
  'National Guide Lecturer': {
    icon: BadgeCheck,
    badgeClass: 'bg-emerald-50 text-emerald-700',
    iconClass: 'text-emerald-600',
  },
};

// Drivers repeatedly upload their national (DMT) driving licence instead of the
// SLTDA tourism licence, so every place that asks for the document says this.
// Mirrored in mobile/src/constants/driverLicense.ts — keep the two in step.
export const LICENSE_COPY = {
  heading: 'SLTDA license',
  typeHeading: 'License type',
  typeHelp: 'Choose the SLTDA-issued license you hold.',
  photoHeading: 'SLTDA license photo',
  photoHelp: 'A clear photo of the SLTDA license selected above.',
  warningTitle: 'Do not upload your driving license',
  warningBody:
    'We only accept the tourism license issued by the Sri Lanka Tourism Development Authority (SLTDA). An ordinary Department of Motor Traffic (DMT) driving license is not accepted and the application will be rejected.',
};

export const getLicenseBadge = (licenseType) => LICENSE_BADGE_STYLES[licenseType] || null;
