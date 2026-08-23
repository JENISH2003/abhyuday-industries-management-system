import mongoose, { Schema } from 'mongoose';
import { IStabilityRecord } from '../types';

const StabilityHistorySchema = new Schema(
  {
    interval: {
      type: String,
      required: true,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    completedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedByName: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    fileName: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    folderPath: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const StabilityRecordSchema: Schema<IStabilityRecord> = new Schema(
  {
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
      index: true,
    },
    stabilityStartDate: {
      type: Date,
      required: [true, 'Stability start date is required'],
      index: true,
    },
    stabilityEndDate: {
      type: Date,
      required: [true, 'Stability end date is required'],
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    currentIntervalMonths: {
      type: Number,
      default: 3,
    },
    currentIntervalLabel: {
      type: String,
      default: '3M',
      trim: true,
    },
    currentDueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ongoing', 'finished', 'completed'],
      default: 'ongoing',
      index: true,
    },
    sentOneDayBefore: {
      type: Boolean,
      default: false,
    },
    sentOnDueDate: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    history: [StabilityHistorySchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IStabilityRecord>('StabilityRecord', StabilityRecordSchema);
