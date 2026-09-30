// Mirrors frontend/src/constants/driverLicense.js — same three enum values as the
// backend's LICENSE_TYPES, same color mapping as the web badges (blue/amber/emerald).
import { BadgeCheck, Crown } from 'lucide-react-native';
import type { LicenseType } from '../types';

export const LICENSE_TYPES: LicenseType[] = [
  'Tourist Driver',
  'Chauffeur Guide Lecturer',
  'National Guide Lecturer',
];

export const LICENSE_BADGE_STYLES: Record<
  LicenseType,
  { icon: typeof BadgeCheck; bg: string; text: string; iconColor: string; description: string }
> = {
  'Tourist Driver': {
    icon: BadgeCheck,
    bg: 'bg-[#eff6ff]',
    text: 'text-[#1d4ed8]',
    iconColor: '#2563eb',
    description: 'Licensed for private transport around Sri Lanka.',
  },
  'Chauffeur Guide Lecturer': {
    icon: Crown,
    bg: 'bg-[#fffbeb]',
    text: 'text-[#b45309]',
    iconColor: '#b45309',
    description: 'Licensed to both drive and provide professional tour guiding.',
  },
  'National Guide Lecturer': {
    icon: BadgeCheck,
    bg: 'bg-[#ecfdf5]',
    text: 'text-[#047857]',
    iconColor: '#047857',
    description: 'Licensed specialist guide for in-depth cultural and historical guiding.',
  },
};

// Drivers repeatedly upload their national (DMT) driving licence instead of the
// SLTDA tourism licence, so every place that asks for the document says this.
// Mirrored in frontend/src/constants/driverLicense.js — keep the two in step.
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

export const getLicenseBadge = (licenseType?: LicenseType | null) =>
  licenseType ? LICENSE_BADGE_STYLES[licenseType] ?? null : null;
