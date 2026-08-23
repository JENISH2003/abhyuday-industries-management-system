import mongoose, { Schema } from 'mongoose';
import { ICertificate } from '../types';

const CertificateSchema: Schema<ICertificate> = new Schema(
  {
    name: {
      type: String,
      default: '',
      trim: true,
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
    certificateNo: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    issuingAuthority: {
      type: String,
      default: 'General',
      trim: true,
    },
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true,
    },
    folderPath: {
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
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'expiring_soon', 'expired'],
      default: 'active',
      index: true,
    },
    isResolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    sentMilestones: {
      type: [String],
      default: [],
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

export default mongoose.model<ICertificate>('Certificate', CertificateSchema);
