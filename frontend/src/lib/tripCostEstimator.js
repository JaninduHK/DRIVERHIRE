const clampDays = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.min(Math.round(parsed), 30);
};

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeVehicles = (vehicles = []) =>
  vehicles
    .map((vehicle) => {
      const pricePerDay = normalizeNumber(vehicle?.pricePerDay);
      const seats = normalizeNumber(vehicle?.seats);
      return {
        pricePerDay: pricePerDay !== null && pricePerDay > 0 ? pricePerDay : null,
        seats: seats !== null && seats > 0 ? seats : null,
      };
    })
    .filter((vehicle) => vehicle.pricePerDay !== null);

const computePercentile = (sortedEntries, ratio) => {
  if (!Array.isArray(sortedEntries) || sortedEntries.length === 0) {
    return null;
  }
  const clampedRatio = Math.min(Math.max(ratio, 0), 1);
  const index = (sortedEntries.length - 1) * clampedRatio;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lowerValue = sortedEntries[lowerIndex]?.pricePerDay;
  const upperValue = sortedEntries[upperIndex]?.pricePerDay;
  if (lowerValue === undefined) {
    return null;
  }
  if (upperValue === undefined || lowerIndex === upperIndex) {
    return lowerValue;
  }
  const weight = index - lowerIndex;
  return lowerValue * (1 - weight) + upperValue * weight;
};

const toTotal = (dailyValue, days) => {
  if (!Number.isFinite(dailyValue)) {
    return null;
  }
  return dailyValue * days;
};

export const calculateTripEstimate = ({ vehicles = [], seatCount = 0, days = 1 } = {}) => {
  const sanitized = sanitizeVehicles(vehicles);
  if (sanitized.length === 0) {
    return {
      perDay: null,
      totals: null,
      fleetSize: 0,
      seatMatches: 0,
      sampleSize: 0,
      coverage: 0,
      totalDays: clampDays(days),
      seatRequirement: null,
    };
  }

  const normalizedSeat = (() => {
    const parsedSeat = normalizeNumber(seatCount);
    if (!Number.isFinite(parsedSeat) || parsedSeat <= 0) {
      return null;
    }
    return Math.min(Math.round(parsedSeat), 15);
  })();

  const filtered = normalizedSeat
    ? sanitized.filter((vehicle) => (vehicle.seats ?? normalizedSeat) >= normalizedSeat)
    : sanitized;

  const sample = filtered.length > 0 ? filtered : sanitized;
  const sorted = [...sample].sort((a, b) => a.pricePerDay - b.pricePerDay);
  const dailyAverage = sorted.reduce((sum, vehicle) => sum + vehicle.pricePerDay, 0) / sorted.length;
  const dailyLow = computePercentile(sorted, 0.25) ?? sorted[0].pricePerDay;
  const dailyHigh = computePercentile(sorted, 0.75) ?? sorted[sorted.length - 1].pricePerDay;
  const dailyMin = sorted[0].pricePerDay;
  const dailyMax = sorted[sorted.length - 1].pricePerDay;

  const totalDays = clampDays(days);

  return {
    perDay: {
      average: dailyAverage,
      low: dailyLow,
      high: dailyHigh,
      min: dailyMin,
      max: dailyMax,
    },
    totals: {
      average: toTotal(dailyAverage, totalDays),
      low: toTotal(dailyLow, totalDays),
      high: toTotal(dailyHigh, totalDays),
      min: toTotal(dailyMin, totalDays),
      max: toTotal(dailyMax, totalDays),
    },
    fleetSize: sanitized.length,
    seatMatches: filtered.length,
    sampleSize: sample.length,
    coverage: sanitized.length ? filtered.length / sanitized.length : 0,
    totalDays,
    seatRequirement: normalizedSeat,
  };
};

export const buildSeatDistribution = (vehicles = []) => {
  const sanitized = sanitizeVehicles(vehicles);
  const total = sanitized.length || 1;

  const buckets = [
    { id: 'sedan', label: 'Sedan (1-3 seats)', min: 1, max: 3 },
    { id: 'mpv', label: 'MPV (4-6 seats)', min: 4, max: 6 },
    { id: 'van', label: 'Van (7-10 seats)', min: 7, max: 10 },
    { id: 'coach', label: 'Mini coach (11+ seats)', min: 11, max: Infinity },
    { id: 'flex', label: 'Flexible / unspecified', min: null, max: null },
  ];

  return buckets.map((bucket) => {
    const count = sanitized.filter((vehicle) => {
      if (bucket.id === 'flex') {
        return vehicle.seats === null;
      }
      if (vehicle.seats === null) {
        return false;
      }
      return vehicle.seats >= bucket.min && vehicle.seats <= bucket.max;
    }).length;

    return {
      ...bucket,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    };
  });
};

export const normalizeLocation = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase();

const routeInsights = [
  {
    id: 'colombo-kandy',
    from: ['colombo', 'cmb', 'katunayake', 'bandaranaike'],
    to: ['kandy', 'peradeniya'],
    distance: '115 km',
    travelTime: '3 – 4 hrs',
    summary: 'Expect a steady climb after Kadugannawa; most drivers plan comfort stops every 90 minutes.',
    tip: 'Leave Colombo before 8am to skip rush-hour traffic around Warakapola.',
  },
  {
    id: 'kandy-ella',
    from: ['kandy', 'peradeniya'],
    to: ['ella', 'badulla', 'haputale'],
    distance: '135 km',
    travelTime: '4.5 – 5.5 hrs',
    summary: 'The A5 is scenic but slow with mist and hairpins near Nuwara Eliya.',
    tip: 'Keep warm layers handy and add at least one tea estate stop.',
  },
  {
    id: 'colombo-galle',
    from: ['colombo', 'cmb', 'katunayake'],
    to: ['galle', 'ahungalla', 'mirissa', 'matara'],
    distance: '150 km',
    travelTime: '2.5 – 3 hrs',
    summary: 'Expressway travel is quick, but most guests add lunch or turtle hatchery stops.',
    tip: 'Have rupees ready for expressway toll booths.',
  },
  {
    id: 'sigiriya-trinco',
    from: ['sigiriya', 'dambulla', 'habarana'],
    to: ['trincomalee', 'nilaveli', 'uver', 'uppuveli'],
    distance: '120 km',
    travelTime: '2.5 – 3.5 hrs',
    summary: 'Dry-zone highways are wide open; drivers factor buffer time for wildlife crossings at dawn.',
    tip: 'Carry water—fuel stops are sparse after Habarana.',
  },
];

export const getRouteInsight = (start, end) => {
  const normalizedStart = normalizeLocation(start);
  const normalizedEnd = normalizeLocation(end);

  const matched = routeInsights.find(
    (route) => route.from.includes(normalizedStart) && route.to.includes(normalizedEnd)
  );

  if (matched) {
    return matched;
  }

  return {
    id: 'default',
    distance: 'Varies',
    travelTime: '4 – 6 hrs typical daily drive',
    summary: 'Sri Lankan driver-guided trips average 120–150 km per day with lots of scenic pauses.',
    tip: 'Plan one buffer day per week for weather or spontaneous stops.',
  };
};

export const priceFormatter = (value) => {
  if (!Number.isFinite(value)) {
    return null;
  }
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};
