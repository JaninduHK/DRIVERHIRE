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

export const getLicenseBadge = (licenseType) => LICENSE_BADGE_STYLES[licenseType] || null;
