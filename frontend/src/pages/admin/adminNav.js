import {
  Archive,
  CalendarDays,
  Car,
  CircleUserRound,
  ClipboardList,
  FileText,
  Gauge,
  LayoutDashboard,
  MessageCircle,
  Percent,
  Send,
  ShieldAlert,
  ShieldCheck,
  Star,
  Users,
  Wallet,
} from 'lucide-react';

export const ADMIN_NAV_GROUPS = [
  { label: '', items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }] },
  {
    label: 'MARKETPLACE',
    items: [
      { id: 'bookings', label: 'Bookings', icon: CalendarDays },
      { id: 'discounts', label: 'Discounts', icon: Percent },
      { id: 'briefs', label: 'Briefs', icon: FileText },
      { id: 'offers', label: 'Offers', icon: Send },
      { id: 'conversations', label: 'Conversations', icon: MessageCircle },
      { id: 'abuse', label: 'Abuse', icon: ShieldAlert },
    ],
  },
  {
    label: 'SUPPLY & PEOPLE',
    items: [
      { id: 'users', label: 'Users', icon: Users },
      { id: 'drivers', label: 'Drivers', icon: CircleUserRound },
      { id: 'vehicles', label: 'Vehicles', icon: Car },
      { id: 'reviews', label: 'Reviews', icon: Star },
      { id: 'verification', label: 'Verification', icon: ShieldCheck },
      { id: 'deleted-drivers', label: 'Deleted drivers', icon: Archive },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { id: 'reports', label: 'Reports', icon: ClipboardList },
      { id: 'performance', label: 'Performance', icon: Gauge },
      { id: 'payments', label: 'Payments', icon: Wallet },
    ],
  },
];
