import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'admin' | 'manager' | 'user';
  status: 'active' | 'blocked';
  isVerified: boolean;
  verificationToken: string | null;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  resetOtp?: string | null;
  resetOtpExpires?: Date | null;
  resetOtpAttempts?: number;
  lastOtpSentAt?: Date | null;
  lastLogin: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  comparePassword(password: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategory extends Document {
  name: string;
  color: string;
  icon: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubcategory extends Document {
  name: string;
  category: Types.ObjectId | ICategory;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface ICertificate extends Document {
  name: string;
  category: Types.ObjectId | any;
  subcategory: Types.ObjectId | any;
  certificateNo: string;
  issuingAuthority: string;
  issueDate: Date;
  expiryDate: Date;
  folderPath?: string;
  fileName?: string;
  fileUrl?: string;
  remarks: string;
  status: 'active' | 'expiring_soon' | 'expired';
  isResolved: boolean;
  resolvedAt: Date | null;
  sentMilestones: string[];
  createdBy: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMeeting extends Document {
  title: string;
  date: Date;
  time: string;
  duration?: string;
  location: string;
  description: string;
  attendees: Array<Types.ObjectId | IUser | string>;
  sendEmail: boolean;
  morningEmailSent?: boolean;
  timeEmailSent?: boolean;
  category: Types.ObjectId | any;
  subcategory: Types.ObjectId | any;
  createdBy: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailLog extends Document {
  subject: string;
  recipient: string;
  type: 'certificate_reminder' | 'meeting_reminder' | 'expiry_alert' | 'login_notification' | 'bulk_summary' | 'password_reset';
  status: 'sent' | 'scheduled' | 'failed';
  sentOn: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface IActivityLog extends Document {
  timestamp: Date;
  userId: Types.ObjectId | string | null;
  userName: string;
  action: string;
  module: 'Auth' | 'Certificate' | 'Meeting' | 'User' | 'System';
  details: string;
  ipAddress: string;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'super_admin' | 'admin' | 'manager' | 'user';
    email: string;
    name?: string;
  };
}

export interface IRefreshToken extends Document {
  tokenHash: string;
  user: Types.ObjectId | IUser;
  expiresAt: Date;
  createdByIp?: string;
  userAgent?: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface IStabilityHistory {
  _id?: string;
  interval: string;
  dueDate: Date;
  completedDate: Date;
  completedBy: Types.ObjectId | IUser | string;
  completedByName?: string;
  remarks: string;
  fileName?: string;
  fileUrl?: string;
  folderPath?: string;
  createdAt: Date;
}

export interface IStabilityRecord extends Document {
  productName: string;
  batchNumber: string;
  stabilityStartDate: Date;
  stabilityEndDate: Date;
  description?: string;
  currentIntervalMonths: number; // e.g. 3, 6, 9
  currentIntervalLabel: string; // e.g. "3M", "6M"
  currentDueDate: Date;
  status: 'ongoing' | 'finished' | 'completed';
  sentOneDayBefore: boolean;
  sentOnDueDate: boolean;
  createdBy: Types.ObjectId | IUser;
  history: IStabilityHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPersonalReminderLog {
  triggeredAt: Date;
  slot: string; // e.g. "09:00 AM", "02:00 PM", "Manual"
  status: 'sent' | 'failed' | 'skipped';
  details?: string;
}

export interface IPersonalReminder extends Document {
  title: string;
  description?: string;
  recipientEmail?: string;
  startDate: Date;
  endDate: Date;
  preferredTime?: string; // e.g. "09:00, 14:00"
  status: 'active' | 'completed' | 'paused';
  notifyEmail: boolean;
  notifySystem: boolean;
  user: Types.ObjectId | IUser;
  lastTriggeredAt?: Date | null;
  executionHistory: IPersonalReminderLog[];
  createdAt: Date;
  updatedAt: Date;
}


