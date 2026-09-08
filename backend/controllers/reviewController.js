import mongoose from 'mongoose';
import Review, { REVIEW_STATUS } from '../models/Review.js';
import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import Vehicle, { VEHICLE_STATUS } from '../models/Vehicle.js';
import User, { DRIVER_STATUS, USER_ROLES } from '../models/User.js';
import { mapAssetUrls } from '../utils/assetUtils.js';
import { uploadImage, generateUniqueFilename, deleteMultipleAssets } from '../services/cloudinaryService.js';
import { hashReviewToken } from '../services/reviewRequestService.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const MAX_REVIEW_IMAGES = 4;

const ADMIN_REVIEW_POPULATE = [
  { path: 'vehicle', populate: { path: 'driver', select: 'name email contactNumber' } },
  { path: 'driver', select: 'name email contactNumber' },
  { path: 'booking', select: 'startDate endDate status totalDays totalPrice' },
];

// Upload attached review photos (multer memory buffers) to Cloudinary → array of URLs.
const uploadReviewImages = async (files, ownerId) => {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }
  const urls = [];
  for (const file of files.slice(0, MAX_REVIEW_IMAGES)) {
    if (!file?.buffer) continue;
    const filename = generateUniqueFilename(`review-${ownerId || 'guest'}`);
    // eslint-disable-next-line no-await-in-loop
    const url = await uploadImage(file.buffer, 'reviews', filename);
    if (url) urls.push(url);
  }
  return urls;
};

// Accept already-hosted image URLs (from bulk import): array or delimited string.
const parseImageUrls = (value) => {
  const list = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[|;\n]/)
      : [];
  return list
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => /^https?:\/\//i.test(item))
    .slice(0, MAX_REVIEW_IMAGES);
};

const coerceRating = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (parsed < 1 || parsed > 5) {
    return null;
  }
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
};

const coerceDate = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const shapePublicReview = (review) => ({
  id: review._id ? review._id.toString() : review.id,
  booking: review.booking ? review.booking.toString() : undefined,
  vehicle: review.vehicle ? review.vehicle.toString() : undefined,
  travelerName: review.travelerName || 'Traveler',
  rating: review.rating,
  title: review.title || '',
  comment: review.comment,
  images: Array.isArray(review.images) ? review.images : [],
  visitedStartDate: review.visitedStartDate || null,
  visitedEndDate: review.visitedEndDate || null,
  reviewDate: review.reviewDate || null,
  publishedAt: review.publishedAt || review.updatedAt || review.createdAt,
  createdAt: review.createdAt,
});

const shapeAdminReview = (review, req) => ({
  ...shapePublicReview(review),
  status: review.status,
  adminNote: review.adminNote || '',
  createdByAdmin: Boolean(review.createdByAdmin),
  featured: Boolean(review.featured),
  featuredOrder: typeof review.featuredOrder === 'number' ? review.featuredOrder : null,
  travelerUser: review.travelerUser ? review.travelerUser.toString() : undefined,
  driver: review.driver && typeof review.driver === 'object'
    ? {
        id: review.driver._id ? review.driver._id.toString() : review.driver.id,
        name: review.driver.name,
        email: review.driver.email,
        contactNumber: review.driver.contactNumber,
      }
    : review.driver
      ? review.driver.toString()
      : undefined,
  vehicle:
    review.vehicle && typeof review.vehicle === 'object'
      ? {
          id: review.vehicle._id ? review.vehicle._id.toString() : review.vehicle.id,
          model: review.vehicle.model,
          images: mapAssetUrls(review.vehicle.images, req),
          pricePerDay: review.vehicle.pricePerDay,
          driver:
            review.vehicle.driver && typeof review.vehicle.driver === 'object'
              ? {
                  id: review.vehicle.driver._id
                    ? review.vehicle.driver._id.toString()
                    : review.vehicle.driver.id,
                  name: review.vehicle.driver.name,
                  email: review.vehicle.driver.email,
                  contactNumber: review.vehicle.driver.contactNumber,
                }
              : review.vehicle.driver,
        }
      : review.vehicle,
  booking:
    review.booking && typeof review.booking === 'object'
      ? {
          id: review.booking._id ? review.booking._id.toString() : review.booking.id,
          startDate: review.booking.startDate,
          endDate: review.booking.endDate,
          status: review.booking.status,
          totalDays: review.booking.totalDays,
          totalPrice: review.booking.totalPrice,
        }
      : review.booking,
});

export const createBookingReview = async (req, res) => {
  const { id } = req.params;
  const { rating, title, comment } = req.body || {};

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid booking identifier.' });
  }

  const normalizedRating = coerceRating(rating);
  if (normalizedRating === null) {
    return res.status(400).json({ message: 'Rating must be a number between 1 and 5.' });
  }

  const trimmedComment = typeof comment === 'string' ? comment.trim() : '';
  if (trimmedComment.length < 10) {
    return res
      .status(400)
      .json({ message: 'Please share more details (minimum 10 characters) in your review.' });
  }

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  if (trimmedTitle.length > 120) {
    return res.status(400).json({ message: 'Review title must be under 120 characters.' });
  }

  try {
    const booking = await Booking.findById(id)
      .populate({
        path: 'vehicle',
        select: 'driver status model',
        populate: {
          path: 'driver',
          select: 'name email contactNumber',
        },
      })
      .populate({
        path: 'driver',
        select: 'name email contactNumber',
      });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (!booking.travelerUser || booking.travelerUser.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only review your own bookings.' });
    }

    if (
      booking.status === BOOKING_STATUS.CANCELLED ||
      booking.status === BOOKING_STATUS.REJECTED
    ) {
      return res
        .status(400)
        .json({ message: 'This booking was not completed and cannot receive a review.' });
    }

    const now = new Date();
    const endDate = booking.endDate ? new Date(booking.endDate) : null;
    if (!endDate || Number.isNaN(endDate.getTime()) || endDate > now) {
      return res
        .status(400)
        .json({ message: 'You can only leave a review after your trip has finished.' });
    }

    const existingReview = await Review.findOne({ booking: booking._id });
    if (existingReview) {
      return res.status(409).json({
        message: 'You have already submitted a review for this booking.',
        review: shapePublicReview(existingReview.toJSON ? existingReview.toJSON() : existingReview),
      });
    }

    let images = [];
    try {
      images = await uploadReviewImages(req.files, req.user.id);
    } catch (uploadError) {
      console.error('Review image upload failed:', uploadError);
      return res.status(502).json({ message: 'We could not upload your photos. Please try again.' });
    }

    const review = await Review.create({
      booking: booking._id,
      vehicle: booking.vehicle?._id || booking.vehicle,
      driver: booking.driver?._id || booking.driver,
      travelerUser: booking.travelerUser,
      travelerName: booking.traveler?.fullName || req.user.name || 'Traveler',
      rating: normalizedRating,
      title: trimmedTitle || undefined,
      comment: trimmedComment,
      images,
      visitedStartDate: booking.startDate,
      visitedEndDate: booking.endDate,
      status: REVIEW_STATUS.PENDING,
    });

    return res.status(201).json({
      message: 'Thank you! Your review has been submitted for moderation.',
      review: shapePublicReview(review.toJSON()),
    });
  } catch (error) {
    console.error('Create booking review error:', error);
    return res.status(500).json({ message: 'Unable to submit your review right now.' });
  }
};

export const listVehicleReviews = async (req, res) => {
  const { id } = req.params;
  const { minRating, maxRating, since, until, sort = 'recent' } = req.query || {};

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid vehicle identifier provided.' });
  }

  try {
    const vehicleExists = await Vehicle.exists({
      _id: id,
      status: VEHICLE_STATUS.APPROVED,
    });

    if (!vehicleExists) {
      return res.status(404).json({ message: 'Vehicle not found or unavailable.' });
    }

    const filters = {
      vehicle: id,
      status: REVIEW_STATUS.APPROVED,
    };

    const ratingFilter = {};
    const min = coerceRating(minRating);
    const max = coerceRating(maxRating);
    if (min !== null) {
      ratingFilter.$gte = min;
    }
    if (max !== null) {
      ratingFilter.$lte = max;
    }
    if (Object.keys(ratingFilter).length > 0) {
      filters.rating = ratingFilter;
    }

    const sinceDate = coerceDate(since);
    const untilDate = coerceDate(until);
    if (sinceDate || untilDate) {
      filters.publishedAt = {};
      if (sinceDate) {
        filters.publishedAt.$gte = sinceDate;
      }
      if (untilDate) {
        filters.publishedAt.$lte = untilDate;
      }
    }

    let sortOption = { publishedAt: -1, createdAt: -1 };
    if (sort === 'oldest') {
      sortOption = { publishedAt: 1, createdAt: 1 };
    } else if (sort === 'ratingDesc') {
      sortOption = { rating: -1, publishedAt: -1 };
    } else if (sort === 'ratingAsc') {
      sortOption = { rating: 1, publishedAt: -1 };
    }

    const reviews = await Review.find(filters).sort(sortOption).lean();

    // Surface reviews that have photos first (stable within the requested sort) so their
    // images are visible near the top instead of being buried by newer photo-less reviews.
    reviews.sort((a, b) => {
      const ai = Array.isArray(a.images) && a.images.length ? 1 : 0;
      const bi = Array.isArray(b.images) && b.images.length ? 1 : 0;
      return bi - ai;
    });

    if (reviews.length === 0) {
      return res.json({
        reviews: [],
        meta: {
          total: 0,
          averageRating: null,
          countsByRating: [0, 0, 0, 0, 0],
        },
      });
    }

    const countsByRating = [0, 0, 0, 0, 0];
    let ratingSum = 0;

    const shaped = reviews.map((review) => {
      const ratingIndex = Math.min(Math.max(Math.round(review.rating), 1), 5) - 1;
      if (ratingIndex >= 0 && ratingIndex < countsByRating.length) {
        countsByRating[ratingIndex] += 1;
      }
      ratingSum += review.rating;
      return shapePublicReview(review);
    });

    const averageRating = ratingSum / reviews.length;

    return res.json({
      reviews: shaped,
      meta: {
        total: reviews.length,
        averageRating: Number(averageRating.toFixed(2)),
        countsByRating,
      },
    });
  } catch (error) {
    console.error('List vehicle reviews error:', error);
    return res.status(500).json({ message: 'Unable to load vehicle reviews.' });
  }
};

// Public: the most recent approved reviews across ALL vehicles (homepage carousel).
// Not limited to featured vehicles, so admin-added reviews show up here too.
export const listLatestReviews = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 9, 24);
  const minRating = coerceRating(req.query.minRating);
  try {
    const filters = { status: REVIEW_STATUS.APPROVED };
    if (minRating !== null) {
      filters.rating = { $gte: minRating };
    }

    const populateOpts = [
      { path: 'vehicle', select: 'model driver', populate: { path: 'driver', select: 'name' } },
      { path: 'driver', select: 'name' },
    ];

    // Admin-handpicked reviews always lead, in the order the admin set for them.
    const featuredReviews = await Review.find({ ...filters, featured: true })
      .sort({ featuredOrder: 1 })
      .limit(limit)
      .populate(populateOpts)
      .lean();

    let reviews = featuredReviews;
    if (reviews.length < limit) {
      const remaining = await Review.find({ ...filters, _id: { $nin: featuredReviews.map((r) => r._id) } })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(60)
        .populate(populateOpts)
        .lean();

      // Surface reviews that have photos first, so the homepage cards get cover images.
      const hasImages = (review) => (Array.isArray(review.images) && review.images.length > 0 ? 1 : 0);
      remaining.sort((a, b) => hasImages(b) - hasImages(a));

      reviews = [...reviews, ...remaining];
    }

    const shaped = reviews.slice(0, limit).map((review) => {
      const driverRef = review.vehicle?.driver || review.driver;
      return {
        ...shapePublicReview(review),
        vehicle: review.vehicle
          ? {
              id: review.vehicle._id ? review.vehicle._id.toString() : review.vehicle.id,
              model: review.vehicle.model,
              driver: driverRef
                ? { id: (driverRef._id ? driverRef._id : driverRef).toString(), name: driverRef.name }
                : null,
            }
          : null,
      };
    });

    return res.json({ reviews: shaped });
  } catch (error) {
    console.error('List latest reviews error:', error);
    return res.status(500).json({ message: 'Unable to load reviews.' });
  }
};

export const listAdminReviews = async (req, res) => {
  const { status, driver, featured, sort = 'recent' } = req.query || {};

  const allowedStatuses = new Set(Object.values(REVIEW_STATUS));
  const filters = {};
  if (status) {
    const normalizedStatus = String(status).trim().toLowerCase();
    if (!allowedStatuses.has(normalizedStatus)) {
      return res.status(400).json({ message: `Status must be one of: ${Array.from(allowedStatuses).join(', ')}` });
    }
    filters.status = normalizedStatus;
  }
  if (driver) {
    if (!isValidObjectId(driver)) {
      return res.status(400).json({ message: 'Invalid driver identifier.' });
    }
    filters.driver = driver;
  }
  if (featured !== undefined) {
    filters.featured = String(featured).trim().toLowerCase() === 'true';
  }

  let sortOption = { createdAt: -1 };
  if (sort === 'oldest') {
    sortOption = { createdAt: 1 };
  } else if (sort === 'ratingDesc') {
    sortOption = { rating: -1, createdAt: -1 };
  } else if (sort === 'ratingAsc') {
    sortOption = { rating: 1, createdAt: -1 };
  } else if (sort === 'featuredOrder') {
    sortOption = { featuredOrder: 1, createdAt: -1 };
  }

  try {
    const reviews = await Review.find(filters)
      .sort(sortOption)
      .populate({
        path: 'vehicle',
        populate: {
          path: 'driver',
          select: 'name email contactNumber',
        },
      })
      .populate({
        path: 'driver',
        select: 'name email contactNumber',
      })
      .populate({
        path: 'booking',
        select: 'startDate endDate status totalDays totalPrice',
      })
      .lean();

    const shaped = reviews.map((review) => shapeAdminReview(review, req));

    // Global counts + average (independent of the active filter) so the summary cards stay
    // accurate even when the list is filtered to a single status.
    const [countsAgg, avgAgg] = await Promise.all([
      Review.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Review.aggregate([
        { $match: { status: REVIEW_STATUS.APPROVED } },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]),
    ]);
    const counts = { approved: 0, pending: 0, rejected: 0, total: 0 };
    countsAgg.forEach((row) => {
      if (row._id && counts[row._id] !== undefined) counts[row._id] = row.count;
      counts.total += row.count;
    });
    const globalAverage =
      avgAgg[0]?.avg != null ? Number(Number(avgAgg[0].avg).toFixed(1)) : null;

    return res.json({
      reviews: shaped,
      meta: {
        total: shaped.length,
        status: filters.status || 'all',
        counts,
        averageRating: globalAverage,
      },
    });
  } catch (error) {
    console.error('List admin reviews error:', error);
    return res.status(500).json({ message: 'Unable to load reviews.' });
  }
};

export const createAdminReview = async (req, res) => {
  const {
    driver,
    vehicle,
    rating,
    title,
    comment,
    travelerName,
    reviewDate,
    visitedStartDate,
    visitedEndDate,
    status = REVIEW_STATUS.APPROVED,
  } = req.body || {};

  if (!isValidObjectId(driver)) {
    return res.status(400).json({ message: 'Invalid driver identifier.' });
  }

  if (vehicle && !isValidObjectId(vehicle)) {
    return res.status(400).json({ message: 'Invalid vehicle identifier.' });
  }

  const normalizedRating = coerceRating(rating);
  if (normalizedRating === null) {
    return res.status(400).json({ message: 'Rating must be a whole number between 1 and 5.' });
  }

  const trimmedComment = typeof comment === 'string' ? comment.trim() : '';
  if (trimmedComment.length < 10) {
    return res
      .status(400)
      .json({ message: 'Please include at least 10 characters in the review.' });
  }

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  if (trimmedTitle.length > 120) {
    return res.status(400).json({ message: 'Title must be under 120 characters.' });
  }

  const normalizedStatusInput = typeof status === 'string' ? status.trim().toLowerCase() : status;
  const normalizedStatus = Object.values(REVIEW_STATUS).includes(normalizedStatusInput)
    ? normalizedStatusInput
    : REVIEW_STATUS.APPROVED;
  const reviewDateValue = coerceDate(reviewDate);
  const startDate = coerceDate(visitedStartDate);
  const endDate = coerceDate(visitedEndDate);

  if (startDate && endDate && endDate < startDate) {
    return res.status(400).json({ message: 'End date cannot be before start date.' });
  }

  try {
    const driverDoc = await User.findOne({
      _id: driver,
      role: USER_ROLES.DRIVER,
      driverStatus: DRIVER_STATUS.APPROVED,
      deletedAt: null,
    });

    if (!driverDoc) {
      return res.status(404).json({ message: 'Driver not found or not approved.' });
    }

    let vehicleDoc = null;
    if (vehicle) {
      vehicleDoc = await Vehicle.findById(vehicle);
      if (!vehicleDoc) {
        return res.status(404).json({ message: 'Vehicle not found.' });
      }
      if (vehicleDoc.driver && vehicleDoc.driver.toString() !== driverDoc._id.toString()) {
        return res
          .status(400)
          .json({ message: 'Selected vehicle does not belong to this driver.' });
      }
    } else {
      vehicleDoc = await Vehicle.findOne({
        driver: driverDoc._id,
        status: VEHICLE_STATUS.APPROVED,
      });
    }

    // Attached image files (multipart) upload to Cloudinary; already-hosted URLs (from the
    // JSON / CSV path) are merged in after.
    let uploadedImages = [];
    try {
      uploadedImages = await uploadReviewImages(req.files, req.user.id);
    } catch (uploadError) {
      console.error('Admin review image upload failed:', uploadError);
      return res
        .status(502)
        .json({ message: 'We could not upload the review photos. Please try again.' });
    }
    const images = [...uploadedImages, ...parseImageUrls(req.body?.imageUrls)].slice(
      0,
      MAX_REVIEW_IMAGES
    );

    const review = await Review.create({
      driver: driverDoc._id,
      vehicle: vehicleDoc?._id,
      travelerUser: req.user.id,
      travelerName: typeof travelerName === 'string' && travelerName.trim()
        ? travelerName.trim()
        : 'Guest',
      rating: normalizedRating,
      title: trimmedTitle || undefined,
      comment: trimmedComment,
      images,
      reviewDate: reviewDateValue || undefined,
      visitedStartDate: startDate || undefined,
      visitedEndDate: endDate || undefined,
      status: normalizedStatus,
      publishedAt:
        normalizedStatus === REVIEW_STATUS.APPROVED ? reviewDateValue || new Date() : undefined,
      createdByAdmin: true,
    });

    await review.populate(ADMIN_REVIEW_POPULATE);

    return res.status(201).json({
      message:
        normalizedStatus === REVIEW_STATUS.APPROVED
          ? 'Review published.'
          : 'Review saved as draft.',
      review: shapeAdminReview(review.toJSON(), req),
    });
  } catch (error) {
    console.error('Create admin review error:', error);
    return res.status(500).json({ message: 'Unable to create review.' });
  }
};

// Partial edit of an existing review. Every field is optional; only what's sent is
// changed. New photos (multipart) are appended — use removeAdminReviewImage to drop one.
export const updateAdminReview = async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid review identifier.' });
  }

  try {
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    if (body.driver !== undefined) {
      if (!isValidObjectId(body.driver)) {
        return res.status(400).json({ message: 'Invalid driver identifier.' });
      }
      const driverDoc = await User.findOne({
        _id: body.driver,
        role: USER_ROLES.DRIVER,
        driverStatus: DRIVER_STATUS.APPROVED,
        deletedAt: null,
      });
      if (!driverDoc) {
        return res.status(404).json({ message: 'Driver not found or not approved.' });
      }
      review.driver = driverDoc._id;
    }

    if (body.vehicle !== undefined) {
      if (body.vehicle) {
        if (!isValidObjectId(body.vehicle)) {
          return res.status(400).json({ message: 'Invalid vehicle identifier.' });
        }
        const vehicleDoc = await Vehicle.findById(body.vehicle);
        if (!vehicleDoc) {
          return res.status(404).json({ message: 'Vehicle not found.' });
        }
        if (vehicleDoc.driver && review.driver && vehicleDoc.driver.toString() !== review.driver.toString()) {
          return res.status(400).json({ message: 'Selected vehicle does not belong to this driver.' });
        }
        review.vehicle = vehicleDoc._id;
      } else {
        review.vehicle = undefined;
      }
    }

    if (body.rating !== undefined) {
      const rating = coerceRating(body.rating);
      if (rating === null) {
        return res.status(400).json({ message: 'Rating must be a whole number between 1 and 5.' });
      }
      review.rating = rating;
    }

    if (body.comment !== undefined) {
      const trimmedComment = typeof body.comment === 'string' ? body.comment.trim() : '';
      if (trimmedComment.length < 10) {
        return res.status(400).json({ message: 'Please include at least 10 characters in the review.' });
      }
      review.comment = trimmedComment;
    }

    if (body.title !== undefined) {
      const trimmedTitle = typeof body.title === 'string' ? body.title.trim() : '';
      if (trimmedTitle.length > 120) {
        return res.status(400).json({ message: 'Title must be under 120 characters.' });
      }
      review.title = trimmedTitle || undefined;
    }

    if (body.travelerName !== undefined) {
      const trimmedName = typeof body.travelerName === 'string' ? body.travelerName.trim() : '';
      review.travelerName = trimmedName || 'Guest';
    }

    if (body.reviewDate !== undefined) {
      review.reviewDate = coerceDate(body.reviewDate) || undefined;
    }
    if (body.visitedStartDate !== undefined) {
      review.visitedStartDate = coerceDate(body.visitedStartDate) || undefined;
    }
    if (body.visitedEndDate !== undefined) {
      review.visitedEndDate = coerceDate(body.visitedEndDate) || undefined;
    }
    if (review.visitedStartDate && review.visitedEndDate && review.visitedEndDate < review.visitedStartDate) {
      return res.status(400).json({ message: 'End date cannot be before start date.' });
    }

    if (body.status !== undefined) {
      const normalizedStatus = typeof body.status === 'string' ? body.status.trim().toLowerCase() : '';
      if (!Object.values(REVIEW_STATUS).includes(normalizedStatus)) {
        return res.status(400).json({ message: `Status must be one of: ${Object.values(REVIEW_STATUS).join(', ')}` });
      }
      review.status = normalizedStatus;
      review.publishedAt =
        normalizedStatus === REVIEW_STATUS.APPROVED ? review.publishedAt || new Date() : undefined;
      // A review that's no longer published can't stay a homepage pick.
      if (normalizedStatus !== REVIEW_STATUS.APPROVED && review.featured) {
        review.featured = false;
        review.featuredOrder = null;
      }
    }

    let uploadedImages = [];
    try {
      uploadedImages = await uploadReviewImages(req.files, req.user.id);
    } catch (uploadError) {
      console.error('Admin review image upload failed:', uploadError);
      return res.status(502).json({ message: 'We could not upload the review photos. Please try again.' });
    }
    if (uploadedImages.length || body.imageUrls) {
      const existingImages = Array.isArray(review.images) ? review.images : [];
      review.images = [...existingImages, ...uploadedImages, ...parseImageUrls(body.imageUrls)].slice(
        0,
        MAX_REVIEW_IMAGES
      );
    }

    await review.save();
    await review.populate(ADMIN_REVIEW_POPULATE);

    return res.json({
      message: 'Review updated.',
      review: shapeAdminReview(review.toJSON(), req),
    });
  } catch (error) {
    console.error('Update admin review error:', error);
    return res.status(500).json({ message: 'Unable to update review.' });
  }
};

// Remove one photo from a review (admin only). Mirrors removeVehicleImage.
export const removeAdminReviewImage = async (req, res) => {
  const { id } = req.params;
  const { image } = req.body || {};
  const trimmedImage = typeof image === 'string' ? image.trim() : '';

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid review identifier.' });
  }
  if (!trimmedImage) {
    return res.status(400).json({ message: 'Image path is required.' });
  }

  try {
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    const existing = Array.isArray(review.images) ? review.images : [];
    if (!existing.includes(trimmedImage)) {
      return res.status(404).json({ message: 'Image not found on this review.' });
    }

    review.images = existing.filter((entry) => entry !== trimmedImage);
    await review.save();
    await review.populate(ADMIN_REVIEW_POPULATE);

    try {
      await deleteMultipleAssets([trimmedImage], 'image');
    } catch (cleanupError) {
      console.warn('Failed to delete review image from Cloudinary:', cleanupError.message);
    }

    return res.json({
      message: 'Image removed.',
      review: shapeAdminReview(review.toJSON(), req),
    });
  } catch (error) {
    console.error('Remove admin review image error:', error);
    return res.status(500).json({ message: 'Unable to remove image.' });
  }
};

// Toggle whether a review is handpicked for the homepage carousel. Marking a review
// featured puts it at the back of the featured queue (highest featuredOrder + 1);
// unmarking clears its order.
export const setReviewFeatured = async (req, res) => {
  const { id } = req.params;
  const { featured } = req.body || {};

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid review identifier.' });
  }
  if (typeof featured !== 'boolean') {
    return res.status(400).json({ message: 'featured must be true or false.' });
  }

  try {
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    if (featured && review.status !== REVIEW_STATUS.APPROVED) {
      return res.status(400).json({ message: 'Only published reviews can be featured on the homepage.' });
    }

    if (featured) {
      const highest = await Review.findOne({ featured: true }).sort({ featuredOrder: -1 }).select('featuredOrder');
      review.featured = true;
      review.featuredOrder = (highest?.featuredOrder ?? -1) + 1;
    } else {
      review.featured = false;
      review.featuredOrder = null;
    }

    await review.save();
    await review.populate(ADMIN_REVIEW_POPULATE);

    return res.json({
      message: featured ? 'Review added to homepage picks.' : 'Review removed from homepage picks.',
      review: shapeAdminReview(review.toJSON(), req),
    });
  } catch (error) {
    console.error('Set review featured error:', error);
    return res.status(500).json({ message: 'Unable to update homepage picks.' });
  }
};

// Persists the admin's drag/reorder of the featured-reviews list. Body: { orderedIds: [...] }
// — every id must already be featured; their featuredOrder is rewritten 0..n-1 in that order.
export const reorderFeaturedReviews = async (req, res) => {
  const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
  if (!orderedIds.length || !orderedIds.every(isValidObjectId)) {
    return res.status(400).json({ message: 'Provide a non-empty list of valid review ids.' });
  }

  try {
    const count = await Review.countDocuments({ _id: { $in: orderedIds }, featured: true });
    if (count !== orderedIds.length) {
      return res.status(400).json({ message: 'All reviews being reordered must already be featured.' });
    }

    await Review.bulkWrite(
      orderedIds.map((reviewId, index) => ({
        updateOne: { filter: { _id: reviewId }, update: { $set: { featuredOrder: index } } },
      }))
    );

    return res.json({ message: 'Homepage picks reordered.' });
  } catch (error) {
    console.error('Reorder featured reviews error:', error);
    return res.status(500).json({ message: 'Unable to reorder homepage picks.' });
  }
};

export const updateReviewStatus = async (req, res) => {
  const { id } = req.params;
  const { status, adminNote } = req.body || {};

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid review identifier.' });
  }

  const allowedStatuses = Object.values(REVIEW_STATUS);
  const normalizedStatus = typeof status === 'string' ? status.trim().toLowerCase() : '';

  if (!allowedStatuses.includes(normalizedStatus)) {
    return res.status(400).json({
      message: `Status must be one of: ${allowedStatuses.join(', ')}`,
    });
  }

  if (adminNote && adminNote.length > 500) {
    return res.status(400).json({ message: 'Admin note must be under 500 characters.' });
  }

  try {
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    review.status = normalizedStatus;
    review.adminNote = adminNote ? adminNote.trim() : undefined;
    review.publishedAt =
      normalizedStatus === REVIEW_STATUS.APPROVED ? new Date() : undefined;
    // A review that's no longer published can't stay a homepage pick.
    if (normalizedStatus !== REVIEW_STATUS.APPROVED && review.featured) {
      review.featured = false;
      review.featuredOrder = null;
    }

    await review.save();
    await review.populate(ADMIN_REVIEW_POPULATE);

    return res.json({
      message:
        normalizedStatus === REVIEW_STATUS.APPROVED
          ? 'Review approved and published.'
          : normalizedStatus === REVIEW_STATUS.REJECTED
          ? 'Review rejected.'
          : 'Review status updated.',
      review: shapeAdminReview(review.toJSON(), req),
    });
  } catch (error) {
    console.error('Update review status error:', error);
    return res.status(500).json({ message: 'Unable to update review status.' });
  }
};

// Bulk-create reviews from an admin CSV import. Body: { reviews: [...] } (or a bare array).
// Each row references a driver by `driverEmail` or `driverId`; `vehicleId` optional.
export const createAdminReviewsBulk = async (req, res) => {
  const rows = Array.isArray(req.body?.reviews)
    ? req.body.reviews
    : Array.isArray(req.body)
      ? req.body
      : null;

  if (!rows || rows.length === 0) {
    return res.status(400).json({ message: 'Provide a non-empty list of reviews to import.' });
  }
  if (rows.length > 500) {
    return res.status(400).json({ message: 'You can import up to 500 reviews at a time.' });
  }

  const results = { created: 0, failed: 0, errors: [] };
  const driverCache = new Map();
  const statusValues = Object.values(REVIEW_STATUS);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] || {};
    const rowNumber = index + 1;
    try {
      const driverIdRaw = typeof row.driverId === 'string' ? row.driverId.trim() : '';
      const driverEmailRaw = typeof row.driverEmail === 'string' ? row.driverEmail.trim().toLowerCase() : '';
      const cacheKey = driverIdRaw || driverEmailRaw;
      if (!cacheKey) {
        throw new Error('driverId or driverEmail is required');
      }

      let driverDoc = driverCache.get(cacheKey);
      if (driverDoc === undefined) {
        if (driverIdRaw && isValidObjectId(driverIdRaw)) {
          // eslint-disable-next-line no-await-in-loop
          driverDoc = await User.findOne({ _id: driverIdRaw, role: USER_ROLES.DRIVER });
        } else if (driverEmailRaw) {
          // eslint-disable-next-line no-await-in-loop
          driverDoc = await User.findOne({ email: driverEmailRaw, role: USER_ROLES.DRIVER });
        } else {
          driverDoc = null;
        }
        driverCache.set(cacheKey, driverDoc);
      }
      if (!driverDoc) {
        throw new Error(`Driver not found (${driverEmailRaw || driverIdRaw})`);
      }

      const rating = coerceRating(row.rating);
      if (rating === null) {
        throw new Error('rating must be a whole number between 1 and 5');
      }
      const comment = typeof row.comment === 'string' ? row.comment.trim() : '';
      if (comment.length < 10) {
        throw new Error('comment must be at least 10 characters');
      }
      const title = typeof row.title === 'string' ? row.title.trim().slice(0, 120) : '';

      let vehicleId;
      if (row.vehicleId && isValidObjectId(String(row.vehicleId).trim())) {
        // eslint-disable-next-line no-await-in-loop
        const vehicleDoc = await Vehicle.findById(String(row.vehicleId).trim());
        if (!vehicleDoc) {
          throw new Error('vehicleId not found');
        }
        if (vehicleDoc.driver && vehicleDoc.driver.toString() !== driverDoc._id.toString()) {
          throw new Error('vehicle does not belong to the referenced driver');
        }
        vehicleId = vehicleDoc._id;
      } else {
        // eslint-disable-next-line no-await-in-loop
        const vehicleDoc = await Vehicle.findOne({
          driver: driverDoc._id,
          status: VEHICLE_STATUS.APPROVED,
        });
        vehicleId = vehicleDoc?._id;
      }

      const statusInput = typeof row.status === 'string' ? row.status.trim().toLowerCase() : '';
      const status = statusValues.includes(statusInput) ? statusInput : REVIEW_STATUS.APPROVED;
      const startDate = coerceDate(row.visitedStartDate);
      const endDate = coerceDate(row.visitedEndDate);
      const reviewDate = coerceDate(row.reviewDate) || startDate;
      const travelerName =
        typeof row.travelerName === 'string' && row.travelerName.trim()
          ? row.travelerName.trim().slice(0, 120)
          : 'Guest';

      // eslint-disable-next-line no-await-in-loop
      await Review.create({
        driver: driverDoc._id,
        vehicle: vehicleId,
        travelerUser: req.user.id,
        travelerName,
        rating,
        title: title || undefined,
        comment,
        images: parseImageUrls(row.imageUrls),
        reviewDate: reviewDate || undefined,
        visitedStartDate: startDate || undefined,
        visitedEndDate: endDate || undefined,
        status,
        publishedAt:
          status === REVIEW_STATUS.APPROVED
            ? reviewDate || endDate || startDate || new Date()
            : undefined,
        createdByAdmin: true,
      });
      results.created += 1;
    } catch (error) {
      results.failed += 1;
      results.errors.push({ row: rowNumber, message: error.message || 'Invalid row' });
    }
  }

  return res.status(results.created > 0 ? 201 : 400).json({
    message: `${results.created} review${results.created === 1 ? '' : 's'} imported${
      results.failed ? `, ${results.failed} failed` : ''
    }.`,
    created: results.created,
    failed: results.failed,
    errors: results.errors.slice(0, 100),
  });
};

export const deleteAdminReview = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid review identifier.' });
  }

  try {
    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    if (Array.isArray(review.images) && review.images.length > 0) {
      try {
        await deleteMultipleAssets(review.images, 'image');
      } catch (cleanupError) {
        console.error('Review image cleanup failed:', cleanupError);
      }
    }

    return res.json({ message: 'Review deleted.', id });
  } catch (error) {
    console.error('Delete admin review error:', error);
    return res.status(500).json({ message: 'Unable to delete review.' });
  }
};

// Bulk-delete reviews. Body: { ids: [...] }.
export const deleteAdminReviewsBulk = async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const uniqueIds = [...new Set(ids.map((value) => String(value).trim()))].filter(Boolean);

  if (uniqueIds.length === 0) {
    return res.status(400).json({ message: 'Provide a non-empty list of review ids to delete.' });
  }

  const validIds = uniqueIds.filter(isValidObjectId);
  if (validIds.length === 0) {
    return res.status(400).json({ message: 'No valid review identifiers were provided.' });
  }

  try {
    const reviews = await Review.find({ _id: { $in: validIds } }, 'images');
    const allImages = reviews.flatMap((review) => (Array.isArray(review.images) ? review.images : []));

    const result = await Review.deleteMany({ _id: { $in: validIds } });

    if (allImages.length > 0) {
      try {
        await deleteMultipleAssets(allImages, 'image');
      } catch (cleanupError) {
        console.error('Bulk review image cleanup failed:', cleanupError);
      }
    }

    return res.json({
      message: `${result.deletedCount} review${result.deletedCount === 1 ? '' : 's'} deleted.`,
      deleted: result.deletedCount,
    });
  } catch (error) {
    console.error('Bulk delete admin reviews error:', error);
    return res.status(500).json({ message: 'Unable to delete reviews.' });
  }
};

// ---------------------------------------------------------------------------
// Tokenised review flow (from the post-trip email).
//
// These two routes are deliberately UNAUTHENTICATED. Travellers sign in through
// Asgardeo SSO, and forcing an SSO round-trip before the form would cost most of
// the responses. The token is the proof of identity: it is random, single-use,
// expiring, scoped to exactly one booking, and grants nothing but the ability to
// review that trip. Reviews still land as `pending` for admin approval.
// ---------------------------------------------------------------------------

const loadBookingByReviewToken = async (token) => {
  if (typeof token !== 'string' || token.length < 32) return { error: 'INVALID' };

  const booking = await Booking.findOne({ reviewTokenHash: hashReviewToken(token) })
    .populate('driver', 'name')
    .populate('vehicle', 'model images');

  if (!booking) return { error: 'INVALID' };
  if (booking.reviewSubmittedAt) return { error: 'USED', booking };
  if (booking.reviewTokenExpires && booking.reviewTokenExpires < new Date()) {
    return { error: 'EXPIRED', booking };
  }
  return { booking };
};

const TOKEN_ERRORS = {
  INVALID: { status: 404, message: 'This review link is not valid. It may have been mistyped.' },
  USED: { status: 409, message: 'A review has already been submitted for this trip. Thank you!' },
  EXPIRED: { status: 410, message: 'This review link has expired.' },
};

// Opens the review form: returns just enough trip context to show what is being
// reviewed. No traveller contact details are exposed.
export const getReviewInvite = async (req, res) => {
  try {
    const { booking, error } = await loadBookingByReviewToken(req.params.token);
    if (error) {
      const mapped = TOKEN_ERRORS[error];
      return res.status(mapped.status).json({ message: mapped.message, reason: error });
    }

    return res.json({
      invite: {
        bookingId: booking._id.toString(),
        driverName: booking.driver?.name || 'your driver',
        vehicleModel: booking.vehicle?.model || null,
        startDate: booking.startDate,
        endDate: booking.endDate,
        travelerName: booking.traveler?.fullName || '',
      },
    });
  } catch (error) {
    console.error('Get review invite error:', error);
    return res.status(500).json({ message: 'Unable to open this review link right now.' });
  }
};

export const createReviewFromToken = async (req, res) => {
  const { rating, title, comment } = req.body || {};

  const normalizedRating = coerceRating(rating);
  if (normalizedRating === null) {
    return res.status(400).json({ message: 'Rating must be a number between 1 and 5.' });
  }

  const trimmedComment = typeof comment === 'string' ? comment.trim() : '';
  if (trimmedComment.length < 10) {
    return res
      .status(400)
      .json({ message: 'Please share more details (minimum 10 characters) in your review.' });
  }

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  if (trimmedTitle.length > 120) {
    return res.status(400).json({ message: 'Review title must be under 120 characters.' });
  }

  try {
    const { booking, error } = await loadBookingByReviewToken(req.params.token);
    if (error) {
      const mapped = TOKEN_ERRORS[error];
      return res.status(mapped.status).json({ message: mapped.message, reason: error });
    }

    if (await Review.exists({ booking: booking._id })) {
      return res.status(409).json({ message: 'A review has already been submitted for this trip.' });
    }

    const review = await Review.create({
      booking: booking._id,
      vehicle: booking.vehicle?._id || booking.vehicle,
      driver: booking.driver?._id || booking.driver,
      travelerUser: booking.travelerUser,
      travelerName: booking.traveler?.fullName || 'Traveler',
      rating: normalizedRating,
      title: trimmedTitle || undefined,
      comment: trimmedComment,
      visitedStartDate: booking.startDate,
      visitedEndDate: booking.endDate,
      status: REVIEW_STATUS.PENDING,
    });

    // Burn the token. The hash is deliberately KEPT: reuse is blocked by
    // reviewSubmittedAt, and keeping it lets a traveller who clicks the emailed
    // link twice see "already submitted, thank you" instead of a bare "invalid
    // link", which reads like their review failed.
    booking.reviewSubmittedAt = new Date();
    await booking.save();

    return res.status(201).json({
      message: 'Thank you! Your review has been submitted and will appear once approved.',
      review: { id: review._id.toString(), rating: review.rating, status: review.status },
    });
  } catch (error) {
    console.error('Create review from token error:', error);
    return res.status(500).json({ message: 'Unable to submit your review right now.' });
  }
};

