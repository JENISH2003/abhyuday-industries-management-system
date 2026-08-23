import mongoose, { Schema } from 'mongoose';
import { IEmailLog } from '../types';

const EmailLogSchema: Schema<IEmailLog> = new Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['certificate_reminder', 'meeting_reminder', 'expiry_alert', 'login_notification', 'bulk_summary', 'password_reset'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['sent', 'scheduled', 'failed'],
      required: true,
      index: true,
    },
    sentOn: {
      type: Date,
      default: Date.now,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// 1-Day (24 Hours) Automatic Expiration TTL Index for 512MB lifetime database space optimization
EmailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
EmailLogSchema.index({ sentOn: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
