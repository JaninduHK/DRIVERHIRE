import { validationResult } from 'express-validator';
import { sendSupportRequestEmail } from '../services/emailService.js';

export const submitSupportRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    name = '',
    email = '',
    category = '',
    bookingId = '',
    message = '',
  } = req.body || {};

  try {
    await sendSupportRequestEmail({
      name: name.trim(),
      email: email.trim(),
      category: category.trim(),
      bookingId: bookingId.trim(),
      message: message.trim(),
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('Support request email error:', error);
    return res.status(500).json({ message: 'Unable to send your request right now.' });
  }
};
