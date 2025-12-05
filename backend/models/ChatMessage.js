import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalKms: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerExtraKm: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatConversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ['guest', 'driver', 'admin'],
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'offer'],
      default: 'text',
      index: true,
    },
    body: {
      type: String,
      trim: true,
      required: true,
    },
    warning: {
      type: String,
      trim: true,
    },
    violations: {
      type: [String],
      default: [],
    },
    offer: {
      type: offerSchema,
      default: null,
    },
    readBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

messageSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const ChatMessage = mongoose.model('ChatMessage', messageSchema);

export default ChatMessage;
