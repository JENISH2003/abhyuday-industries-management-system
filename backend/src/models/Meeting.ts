import mongoose, { Schema } from 'mongoose';
import { IMeeting } from '../types';

const MeetingSchema: Schema<IMeeting> = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Meeting date is required'],
      index: true,
    },
    time: {
      type: String,
      required: [true, 'Meeting time is required'],
      trim: true,
    },
    duration: {
      type: String,
      required: false,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location or Link is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    attendees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    sendEmail: {
      type: Boolean,
      default: false,
    },
    morningEmailSent: {
      type: Boolean,
      default: false,
    },
    timeEmailSent: {
      type: Boolean,
      default: false,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    subcategory: {
      type: Schema.Types.ObjectId,
      ref: 'Subcategory',
      required: [true, 'Subcategory is required'],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMeeting>('Meeting', MeetingSchema);
