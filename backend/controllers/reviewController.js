import mongoose from 'mongoose';
import Review, { REVIEW_STATUS } from '../models/Review.js';
import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import Vehicle, { VEHICLE_STATUS } from '../models/Vehicle.js';
import { mapAssetUrls } from '../utils/assetUtils.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

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
  visitedStartDate: review.visitedStartDate || null,
  visitedEndDate: review.visitedEndDate || null,
  publishedAt: review.publishedAt || review.updatedAt || review.createdAt,
  createdAt: review.createdAt,
});

const shapeAdminReview = (review, req) => ({
  ...shapePublicReview(review),
  status: review.status,
  adminNote: review.adminNote || '',
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

    const review = await Review.create({
      booking: booking._id,
      vehicle: booking.vehicle?._id || booking.vehicle,
      driver: booking.driver?._id || booking.driver,
      travelerUser: booking.travelerUser,
      travelerName: booking.traveler?.fullName || req.user.name || 'Traveler',
      rating: normalizedRating,
      title: trimmedTitle || undefined,
      comment: trimmedComment,
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

export const listAdminReviews = async (req, res) => {
  const { status, sort = 'recent' } = req.query || {};

  const allowedStatuses = new Set(Object.values(REVIEW_STATUS));
  const filters = {};
  if (status) {
    const normalizedStatus = String(status).trim().toLowerCase();
    if (!allowedStatuses.has(normalizedStatus)) {
      return res.status(400).json({ message: `Status must be one of: ${Array.from(allowedStatuses).join(', ')}` });
    }
    filters.status = normalizedStatus;
  }

  let sortOption = { createdAt: -1 };
  if (sort === 'oldest') {
    sortOption = { createdAt: 1 };
  } else if (sort === 'ratingDesc') {
    sortOption = { rating: -1, createdAt: -1 };
  } else if (sort === 'ratingAsc') {
    sortOption = { rating: 1, createdAt: -1 };
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

    return res.json({
      reviews: shaped,
      meta: {
        total: shaped.length,
        status: filters.status || 'all',
      },
    });
  } catch (error) {
    console.error('List admin reviews error:', error);
    return res.status(500).json({ message: 'Unable to load reviews.' });
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

    await review.save();
    await review.populate([
      {
        path: 'vehicle',
        populate: { path: 'driver', select: 'name email contactNumber' },
      },
      {
        path: 'driver',
        select: 'name email contactNumber',
      },
      {
        path: 'booking',
        select: 'startDate endDate status totalDays totalPrice',
      },
    ]);

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
