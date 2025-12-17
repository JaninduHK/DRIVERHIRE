import mongoose from 'mongoose';
import User, { DRIVER_STATUS, USER_ROLES } from '../models/User.js';
import Vehicle, { VEHICLE_STATUS } from '../models/Vehicle.js';
import Review, { REVIEW_STATUS } from '../models/Review.js';
import CommissionDiscount from '../models/CommissionDiscount.js';
import { buildAssetUrl } from '../utils/assetUtils.js';

const FEATURE_FLAGS = [
  { key: 'englishSpeakingDriver', label: 'English speaking' },
  { key: 'meetAndGreetAtAirport', label: 'Airport meet & greet' },
  { key: 'fuelAndInsurance', label: 'Fuel & insurance included' },
  { key: 'driverMealsAndAccommodation', label: 'Meals & accommodation covered' },
  { key: 'parkingFeesAndTolls', label: 'Parking & tolls covered' },
  { key: 'allTaxes', label: 'All taxes included' },
];

const findActiveCommissionDiscount = async (referenceDate = new Date()) => {
  const target = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const discount = await CommissionDiscount.findOne({
    active: true,
    startDate: { $lte: target },
    endDate: { $gte: target },
  })
    .sort({ discountRate: -1, startDate: -1 })
    .lean();
  return discount;
};

const shapeVehicleCard = (vehicle, req, activeDiscount = null) => {
  const features = FEATURE_FLAGS.filter(({ key }) => Boolean(vehicle[key])).map(
    ({ label }) => label
  );
  const coverImage =
    Array.isArray(vehicle.images) && vehicle.images.length > 0 ? vehicle.images[0] : null;
  const discountRate =
    activeDiscount && typeof activeDiscount.discountRate === 'number'
      ? Math.max(activeDiscount.discountRate, 0)
      : 0;
  const discountPercent =
    activeDiscount?.discountPercent ??
    Math.round(Math.max(discountRate, 0) * 100 * 100) / 100;
  const discountAmountPerDay =
    Number.isFinite(vehicle.pricePerDay) && vehicle.pricePerDay > 0
      ? Math.round(vehicle.pricePerDay * discountRate * 100) / 100
      : null;
  const discountedPricePerDay =
    discountAmountPerDay !== null ? Math.max(vehicle.pricePerDay - discountAmountPerDay, 0) : null;

  return {
    id: vehicle._id.toString(),
    model: vehicle.model,
    year: vehicle.year,
    description: vehicle.description || '',
    pricePerDay: vehicle.pricePerDay,
    seats: vehicle.seats,
    image: buildAssetUrl(coverImage, req),
    features,
    discountedPricePerDay,
    activeDiscount:
      activeDiscount && discountPercent > 0
        ? {
            id: activeDiscount._id?.toString?.() || activeDiscount.id,
            name: activeDiscount.name,
            description: activeDiscount.description,
            discountRate,
            discountPercent,
            startDate: activeDiscount.startDate,
            endDate: activeDiscount.endDate,
            status: activeDiscount.status || 'active',
            discountAmountPerDay,
            discountedPricePerDay,
          }
        : null,
  };
};

const computeAveragePrice = (vehicles = []) => {
  if (!vehicles.length) {
    return null;
  }
  const sum = vehicles.reduce((acc, vehicle) => acc + (vehicle.pricePerDay || 0), 0);
  return Math.round((sum / vehicles.length) * 100) / 100;
};

const deriveReviewScore = (experienceYears, vehicleCount) => {
  const experienceContribution = Math.min(0.6, (experienceYears / 10) * 0.6);
  const fleetContribution = Math.min(0.8, vehicleCount * 0.15);
  const base = 4;
  return Math.min(5, Math.max(4, base + experienceContribution + fleetContribution));
};

const buildDriverSummary = (driver, vehicles = [], reviewStats = null, req, activeDiscount = null) => {
  const cardVehicles = vehicles.map((vehicle) => shapeVehicleCard(vehicle, req, activeDiscount));
  const featuredVehicle = cardVehicles.find((vehicle) => Boolean(vehicle.image)) || cardVehicles[0] || null;
  const averagePricePerDay = computeAveragePrice(vehicles);
  const experienceYears = driver.createdAt
    ? Math.max(
        1,
        Math.floor(
          (Date.now() - new Date(driver.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)
        )
      )
    : 1;

  const featureCounts = FEATURE_FLAGS.reduce((acc, { key }) => {
    acc[key] = vehicles.some((vehicle) => Boolean(vehicle[key]));
    return acc;
  }, {});

  const badges = FEATURE_FLAGS.filter(({ key }) => featureCounts[key]).map(({ label }) => label);
  const hasReviewStats = reviewStats && Number.isFinite(reviewStats.reviewCount);
  const fallbackReviewScore = deriveReviewScore(experienceYears, vehicles.length);
  const fallbackReviewCount = Math.max(12, vehicles.length * 6 + 10);

  const reviewScore = hasReviewStats && Number.isFinite(reviewStats.averageRating)
    ? reviewStats.averageRating
    : fallbackReviewScore;
  const reviewCount = hasReviewStats ? reviewStats.reviewCount : fallbackReviewCount;

  const locationPayload = driver.driverLocation
    ? {
        label: driver.driverLocation.label || '',
        latitude: driver.driverLocation.latitude,
        longitude: driver.driverLocation.longitude,
        updatedAt: driver.driverLocation.updatedAt,
      }
    : null;

  return {
    id: driver._id.toString(),
    name: driver.name,
    description: driver.description || '',
    contactNumber: driver.contactNumber || '',
    tripAdvisor: driver.tripAdvisor || '',
    address: driver.address || '',
    vehicleCount: vehicles.length,
    averagePricePerDay,
    featuredVehicle,
    badges,
    experienceYears,
    joinedAt: driver.createdAt,
    hasEnglishDriver: featureCounts.englishSpeakingDriver,
    reviewScore: Math.round(reviewScore * 10) / 10,
    reviewCount,
    profilePhoto: buildAssetUrl(driver.profilePhoto, req),
    location: locationPayload,
    activeDiscount:
      activeDiscount && typeof activeDiscount.discountRate === 'number'
        ? {
            id: activeDiscount._id?.toString?.() || activeDiscount.id,
            name: activeDiscount.name,
            description: activeDiscount.description,
            discountRate: Math.max(activeDiscount.discountRate, 0),
            discountPercent:
              activeDiscount.discountPercent ??
              Math.round(Math.max(activeDiscount.discountRate, 0) * 100 * 100) / 100,
            startDate: activeDiscount.startDate,
            endDate: activeDiscount.endDate,
            status: activeDiscount.status || 'active',
          }
        : null,
  };
};

const buildReviewStatsMap = async (driverIds = []) => {
  if (!driverIds.length) {
    return new Map();
  }

  const stats = await Review.aggregate([
    {
      $match: {
        driver: { $in: driverIds },
        status: REVIEW_STATUS.APPROVED,
      },
    },
    {
      $group: {
        _id: '$driver',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const map = new Map();
  stats.forEach((entry) => {
    if (!entry?._id) return;
    map.set(entry._id.toString(), {
      averageRating: entry.averageRating ? Math.min(5, Math.max(1, entry.averageRating)) : null,
      reviewCount: entry.reviewCount || 0,
    });
  });
  return map;
};

export const listPublicDrivers = async (req, res) => {
  try {
    const drivers = await User.find({
      role: USER_ROLES.DRIVER,
      driverStatus: DRIVER_STATUS.APPROVED,
    })
      .select(
        'name description contactNumber tripAdvisor address createdAt profilePhoto driverLocation'
      )
      .sort({ createdAt: -1 })
      .lean();

    if (drivers.length === 0) {
      return res.json({ drivers: [] });
    }

    const activeDiscount = await findActiveCommissionDiscount();
    const driverIds = drivers.map((driver) => driver._id);
    const vehicles = await Vehicle.find({
      driver: { $in: driverIds },
      status: VEHICLE_STATUS.APPROVED,
    })
      .select(
        'driver model year description pricePerDay seats images englishSpeakingDriver meetAndGreetAtAirport fuelAndInsurance driverMealsAndAccommodation parkingFeesAndTolls allTaxes'
      )
      .lean();

    const vehicleMap = new Map();
    vehicles.forEach((vehicle) => {
      const key = vehicle.driver.toString();
      if (!vehicleMap.has(key)) {
        vehicleMap.set(key, []);
      }
      vehicleMap.get(key).push(vehicle);
    });

    const reviewStatsMap = await buildReviewStatsMap(driverIds);

    const summaries = drivers.map((driver) =>
      buildDriverSummary(
        driver,
        vehicleMap.get(driver._id.toString()) || [],
        reviewStatsMap.get(driver._id.toString()),
        req,
        activeDiscount
      )
    );

    return res.json({ drivers: summaries });
  } catch (error) {
    console.error('List public drivers error:', error);
    return res.status(500).json({ message: 'Unable to load drivers right now.' });
  }
};

export const getPublicDriverDetails = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid driver identifier.' });
  }

  try {
    const driver = await User.findOne({
      _id: id,
      role: USER_ROLES.DRIVER,
      driverStatus: DRIVER_STATUS.APPROVED,
    })
      .select(
        'name description contactNumber tripAdvisor address createdAt profilePhoto driverLocation'
      )
      .lean();

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    const activeDiscount = await findActiveCommissionDiscount();
    const vehicles = await Vehicle.find({
      driver: id,
      status: VEHICLE_STATUS.APPROVED,
    })
      .select(
        'model year description pricePerDay seats images englishSpeakingDriver meetAndGreetAtAirport fuelAndInsurance driverMealsAndAccommodation parkingFeesAndTolls allTaxes availability'
      )
      .sort({ pricePerDay: 1 })
      .lean();

    const shapedVehicles = vehicles.map((vehicle) => ({
      ...shapeVehicleCard(vehicle, req, activeDiscount),
      availability: Array.isArray(vehicle.availability)
        ? vehicle.availability.map((entry) => ({
            id: entry._id ? entry._id.toString() : undefined,
            startDate: entry.startDate,
            endDate: entry.endDate,
            status: entry.status,
          }))
        : [],
    }));

    const reviewStatsMap = await buildReviewStatsMap([driver._id]);
    const driverSummary = buildDriverSummary(
      driver,
      vehicles,
      reviewStatsMap.get(driver._id.toString()),
      req,
      activeDiscount
    );

    return res.json({
      driver: driverSummary,
      vehicles: shapedVehicles,
    });
  } catch (error) {
    console.error('Get public driver details error:', error);
    return res.status(500).json({ message: 'Unable to load driver details right now.' });
  }
};
