import mongoose, { Schema } from 'mongoose';
import { IPersonalReminder } from '../types';

const PersonalReminderSchema: Schema<IPersonalReminder> = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true,
    },
    preferredTime: {
      type: String,
      default: '09:00 AM, 02:00 PM',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active',
      index: true,
    },
    notifyEmail: {
      type: Boolean,
      default: true,
    },
    notifySystem: {
      type: Boolean,
      default: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastTriggeredAt: {
      type: Date,
      default: null,
    },
    executionHistory: [
      {
        triggeredAt: { type: Date, default: Date.now },
        slot: { type: String, required: true },
        status: { type: String, enum: ['sent', 'failed', 'skipped'], default: 'sent' },
        details: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPersonalReminder>('PersonalReminder', PersonalReminderSchema);
