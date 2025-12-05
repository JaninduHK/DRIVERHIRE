import { validationResult } from 'express-validator';
import CommissionDiscount, { MAX_DISCOUNT_RATE } from '../models/CommissionDiscount.js';
import Booking from '../models/Booking.js';

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const clampRate = (rate) => {
  if (!Number.isFinite(rate)) {
    return 0;
  }
  if (rate < 0) {
    return 0;
  }
  if (rate > MAX_DISCOUNT_RATE) {
    return MAX_DISCOUNT_RATE;
  }
  return rate;
};

const recalcBookingsForRange = async (startDate, endDate) => {
  if (!startDate || !endDate) {
    return 0;
  }

  const normalizedStart = new Date(startDate);
  const normalizedEnd = new Date(endDate);
  if (Number.isNaN(normalizedStart.getTime()) || Number.isNaN(normalizedEnd.getTime())) {
    return 0;
  }

  const bookings = await Booking.find({
    startDate: { $gte: normalizedStart, $lte: normalizedEnd },
  }).select(
    '_id startDate totalPrice commissionBaseRate commissionRate commissionAmount driverEarnings commissionDiscount commissionDiscountLabel commissionDiscountRate'
  );

  let updated = 0;
  for (const booking of bookings) {
    const changed = await booking.applyCommissionRules();
    if (changed) {
      await booking.save();
      updated += 1;
    }
  }

  return updated;
};

const recalcForRanges = async (ranges = []) => {
  const seen = new Set();
  let total = 0;
  for (const range of ranges) {
    if (!range?.startDate || !range?.endDate) {
      continue;
    }
    const key = `${new Date(range.startDate).toISOString()}_${new Date(range.endDate).toISOString()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    total += await recalcBookingsForRange(range.startDate, range.endDate);
  }
  return total;
};

export const listCommissionDiscounts = async (_req, res) => {
  try {
    const discounts = await CommissionDiscount.find().sort({ startDate: -1 });
    return res.json({
      discounts: discounts.map((discount) => discount.toJSON()),
    });
  } catch (error) {
    console.error('List commission discounts error:', error);
    return res.status(500).json({ message: 'Unable to load discounts at the moment.' });
  }
};

export const createCommissionDiscount = async (req, res) => {
  if (handleValidation(req, res)) {
    return;
  }

  const {
    name,
    description,
    discountPercent,
    startDate: startInput,
    endDate: endInput,
    active = true,
  } = req.body;

  const startDate = parseDate(startInput);
  const endDate = parseDate(endInput);
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start and end dates must be valid ISO dates.' });
  }
  if (endDate < startDate) {
    return res.status(400).json({ message: 'End date must be on or after the start date.' });
  }

  try {
    const rate = clampRate(Number(discountPercent) / 100);
    const discount = new CommissionDiscount({
      name: name.trim(),
      description: description?.trim(),
      discountRate: rate,
      startDate,
      endDate,
      active: Boolean(active),
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await discount.save();

    const recalculated = await recalcBookingsForRange(startDate, endDate);

    return res.status(201).json({
      discount: discount.toJSON(),
      recalculatedBookings: recalculated,
    });
  } catch (error) {
    console.error('Create commission discount error:', error);
    return res.status(500).json({ message: 'Unable to create discount at the moment.' });
  }
};

export const updateCommissionDiscount = async (req, res) => {
  if (handleValidation(req, res)) {
    return;
  }

  const { id } = req.params;
  const {
    name,
    description,
    discountPercent,
    startDate: startInput,
    endDate: endInput,
    active,
  } = req.body;

  try {
    const discount = await CommissionDiscount.findById(id);
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found.' });
    }

    const originalRange = { startDate: discount.startDate, endDate: discount.endDate };

    if (name !== undefined) {
      discount.name = name.trim();
    }
    if (description !== undefined) {
      discount.description = description?.trim();
    }
    if (discountPercent !== undefined) {
      discount.discountRate = clampRate(Number(discountPercent) / 100);
    }
    if (startInput !== undefined) {
      const parsedStart = parseDate(startInput);
      if (!parsedStart) {
        return res.status(400).json({ message: 'Start date must be valid.' });
      }
      discount.startDate = parsedStart;
    }
    if (endInput !== undefined) {
      const parsedEnd = parseDate(endInput);
      if (!parsedEnd) {
        return res.status(400).json({ message: 'End date must be valid.' });
      }
      discount.endDate = parsedEnd;
    }
    if (discount.endDate < discount.startDate) {
      return res.status(400).json({ message: 'End date must be on or after the start date.' });
    }
    if (active !== undefined) {
      discount.active = Boolean(active);
    }

    discount.updatedBy = req.user.id;
    await discount.save();

    const recalculated = await recalcForRanges([
      originalRange,
      { startDate: discount.startDate, endDate: discount.endDate },
    ]);

    return res.json({
      discount: discount.toJSON(),
      recalculatedBookings: recalculated,
    });
  } catch (error) {
    console.error('Update commission discount error:', error);
    return res.status(500).json({ message: 'Unable to update discount at the moment.' });
  }
};

export const deleteCommissionDiscount = async (req, res) => {
  const { id } = req.params;

  try {
    const discount = await CommissionDiscount.findById(id);
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found.' });
    }

    const range = { startDate: discount.startDate, endDate: discount.endDate };
    await CommissionDiscount.deleteOne({ _id: id });
    const recalculated = await recalcBookingsForRange(range.startDate, range.endDate);

    return res.json({
      success: true,
      recalculatedBookings: recalculated,
    });
  } catch (error) {
    console.error('Delete commission discount error:', error);
    return res.status(500).json({ message: 'Unable to delete discount at the moment.' });
  }
};
