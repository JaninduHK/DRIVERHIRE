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

export const getLicenseBadge = (licenseType?: LicenseType | null) =>
  licenseType ? LICENSE_BADGE_STYLES[licenseType] ?? null : null;
