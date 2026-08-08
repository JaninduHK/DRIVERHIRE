// Shared API response types (loosely typed — backend fields are optional-tolerant).

export type Role = 'guest' | 'driver' | 'admin';
export type DriverStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isVerified: boolean;
  driverStatus?: DriverStatus;
  authProvider?: 'local' | 'google' | 'facebook';
  contactNumber?: string;
  address?: string;
  description?: string;
  tripAdvisor?: string;
  profilePhoto?: string | null;
  experienceYears?: number;
  driverLocation?: {
    label?: string;
    latitude?: number;
    longitude?: number;
    updatedAt?: string;
  } | null;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DriverOverview {
  profile: User;
  activity: {
    totalTrips: number;
    upcomingTrips: number;
    rating: number;
    lastUpdated: string;
  };
  onboarding: {
    profileTourCompletedAt: string | null;
    showProfileTour: boolean;
    approvedAt: string | null;
  };
}

export interface VehicleImage {
  url?: string;
  publicId?: string;
}

export interface Vehicle {
  id: string;
  model: string;
  year: number;
  description?: string;
  pricePerDay: number;
  seats?: number;
  status?: 'pending' | 'approved' | 'rejected' | string;
  images?: (string | VehicleImage)[];
  englishSpeakingDriver?: boolean;
  meetAndGreetAtAirport?: boolean;
  fuelAndInsurance?: boolean;
  driverMealsAndAccommodation?: boolean;
  parkingFeesAndTolls?: boolean;
  allTaxes?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Booking {
  id: string;
  status?: string;
  totalPrice?: number;
  totalDays?: number;
  guests?: number;
  startDate?: string;
  endDate?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  startPoint?: string;
  endPoint?: string;
  route?: string;
  specialRequests?: string;
  flightNumber?: string | null;
  arrivalTime?: string | null;
  departureTime?: string | null;
  traveler?: { id?: string; name?: string; fullName?: string; email?: string; phoneNumber?: string } | null;
  travelerName?: string;
  vehicle?: Vehicle | null;
  vehicleModel?: string;
  vehicleLabel?: string;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  participantName?: string;
  traveler?: { id?: string; name?: string; profilePhoto?: string | null } | null;
  lastMessage?: { body?: string; createdAt?: string; type?: string } | null;
  lastMessagePreview?: string;
  unreadCount?: number;
  updatedAt?: string;
  subtitle?: string;
}

export interface ChatMessage {
  id: string;
  body?: string;
  senderId?: string;
  senderRole?: Role;
  isMine?: boolean;
  type?: 'text' | 'offer' | string;
  offer?: Offer | null;
  createdAt?: string;
}

export interface Offer {
  id: string;
  status?: string;
  totalPrice?: number;
  totalKms?: number;
  pricePerExtraKm?: number;
  includedKm?: number; // legacy alias
  extraKmRate?: number; // legacy alias
  vehicle?: Vehicle | null;
  vehicleLabel?: string;
  note?: string;
  startDate?: string;
  endDate?: string;
}

export interface Brief {
  id: string;
  title?: string;
  route?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  startDate?: string;
  endDate?: string;
  guests?: number;
  budget?: number;
  budgetHint?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  hasResponded?: boolean;
}

export interface EarningsBooking {
  id?: string;
  travelerName?: string;
  startDate?: string;
  endDate?: string;
  totalPrice?: number;
  driverEarnings?: number;
  commissionBaseRate?: number;
}

export interface EarningsSummary {
  period?: { value?: string; label?: string; commissionDueDate?: string };
  totals?: {
    totalGross?: number;
    driverEarnings?: number;
    commissionDue?: number;
    commissionRate?: number;
    effectiveCommissionRate?: number;
    bookingCount?: number;
  };
  commission?: { id?: string; status?: string; paymentSlipUrl?: string };
  bookings?: EarningsBooking[];
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    swiftCode?: string;
    referenceNote?: string;
  };
  discount?: {
    name?: string;
    discountPercent?: number;
    discountRate?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  } | null;
}

export interface EarningsHistoryEntry {
  period?: { value?: string; label?: string };
}
