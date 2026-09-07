#!/usr/bin/env node

/**
 * Backfill: inject the tour-brief "quote request" message into conversations
 * that were created before this feature existed, so older threads also open
 * with the traveller's request above the driver's offer.
 *
 * Idempotent — safe to run repeatedly; it skips any conversation that already
 * has this brief's card. Run once after deploying the brief-message feature.
 *
 * Usage:
 *   node scripts/backfillBriefMessages.js [--dry-run]
 *
 *   --dry-run   Report what would change without writing anything.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TourBrief from '../models/TourBrief.js';
import ChatMessage from '../models/ChatMessage.js';
import { USER_ROLES } from '../models/User.js';
import { sanitizeMessageContent } from '../utils/chatSanitizer.js';

dotenv.config();

const isDryRun = process.argv.slice(2).includes('--dry-run');

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log(`Connected to MongoDB. ${isDryRun ? 'DRY RUN — no writes will be made.' : 'Live run.'}`);

  const briefs = await TourBrief.find({ 'responses.0': { $exists: true } });
  console.log(`Found ${briefs.length} brief(s) with at least one response.`);

  let inserted = 0;
  let skipped = 0;

  for (const brief of briefs) {
    const { sanitized } = sanitizeMessageContent(brief.message || '');
    const guestsLabel = `${brief.adults} adult${brief.adults === 1 ? '' : 's'}${
      brief.children > 0 ? `, ${brief.children} child${brief.children === 1 ? '' : 'ren'}` : ''
    }`;

    // A brief can be responded to by several drivers, each in their own thread.
    const conversationIds = [
      ...new Set(brief.responses.map((r) => r.conversation?.toString()).filter(Boolean)),
    ];

    for (const conversationId of conversationIds) {
      const existing = await ChatMessage.findOne({
        conversation: conversationId,
        type: 'brief',
        'briefRequest.brief': brief._id,
      }).select('_id');

      if (existing) {
        skipped += 1;
        continue;
      }

      // Stamp the card just above that thread's offer message so ordering matches
      // what new responses produce.
      const response = brief.responses.find(
        (r) => r.conversation?.toString() === conversationId && r.message
      );
      let stamp = new Date(brief.createdAt || Date.now());
      if (response?.message) {
        const offerMsg = await ChatMessage.findById(response.message).select('createdAt');
        if (offerMsg?.createdAt) {
          stamp = new Date(offerMsg.createdAt.getTime() - 1000);
        }
      }

      if (isDryRun) {
        console.log(
          `[dry-run] would insert brief card into conversation ${conversationId} (brief ${brief._id})`
        );
        inserted += 1;
        continue;
      }

      const message = new ChatMessage({
        conversation: conversationId,
        sender: brief.traveler,
        senderRole: USER_ROLES.GUEST,
        type: 'brief',
        body: `Trip request: ${brief.startLocation} → ${brief.endLocation} · ${guestsLabel}`,
        briefRequest: {
          brief: brief._id,
          startLocation: brief.startLocation,
          endLocation: brief.endLocation,
          startDate: brief.startDate,
          endDate: brief.endDate,
          adults: brief.adults,
          children: brief.children,
          country: brief.country,
          message: sanitized || '',
        },
        readBy: [brief.traveler],
        createdAt: stamp,
        updatedAt: stamp,
      });
      await message.save({ timestamps: false });
      inserted += 1;
    }
  }

  console.log(
    `Done. ${isDryRun ? 'Would insert' : 'Inserted'}: ${inserted}, skipped (already present): ${skipped}.`
  );
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
