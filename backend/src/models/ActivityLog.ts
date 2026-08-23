import mongoose, { Schema } from 'mongoose';
import { IActivityLog } from '../types';

const ActivityLogSchema: Schema<IActivityLog> = new Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    userId: {
      type: Schema.Types.Mixed, // ObjectId referencing User or String/null if guest/system
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    module: {
      type: String,
      enum: ['Auth', 'Certificate', 'Meeting', 'User', 'System'],
      required: true,
      index: true,
    },
    details: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// 1-Day (24 Hours) Automatic Expiration TTL Index for 512MB lifetime database space optimization
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
ActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

// Enforce Immutability: Prevent modification of existing documents (Updates blocked, Deletions allowed for Super Admin maintenance)
ActivityLogSchema.pre<IActivityLog>('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Activity logs cannot be modified once created.'));
  }
  next();
});

const blockUpdate = function (this: any, next: any) {
  next(new Error('Activity logs cannot be modified once created.'));
};

ActivityLogSchema.pre('updateOne', blockUpdate);
ActivityLogSchema.pre('updateMany', blockUpdate);
ActivityLogSchema.pre('replaceOne', blockUpdate);

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
export { ActivityLogSchema };
