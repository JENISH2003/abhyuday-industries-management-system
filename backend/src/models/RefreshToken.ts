import mongoose, { Schema } from 'mongoose';
import { IRefreshToken } from '../types';

const RefreshTokenSchema: Schema<IRefreshToken> = new Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // MongoDB TTL Index: automatically removes document when expiresAt date is reached
      expires: 0,
    },
    createdByIp: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
