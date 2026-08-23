import { z } from 'zod';

// Strong password policy validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const RegisterValidator = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(50),
  email: z.string().email('Please enter a valid email address'),
  password: passwordSchema,
  role: z.enum(['super_admin', 'admin', 'manager', 'user']).optional(),
});

export const LoginValidator = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const UpdatePasswordValidator = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: passwordSchema,
});

export const ForgotPasswordValidator = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const ResetPasswordValidator = z.object({
  token: z.string(),
  password: passwordSchema,
});

export const CertificateValidator = z.object({
  name: z.string().optional().default(''),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().min(1, 'Subcategory is required'),
  certificateNo: z.string().optional().default(''),
  issuingAuthority: z.string().optional().default('General'),
  issueDate: z.string().transform((str) => new Date(str)),
  expiryDate: z.string().transform((str) => new Date(str)),
  folderPath: z.string().optional().default(''),
  remarks: z.string().optional().default(''),
});

export const MeetingValidator = z.object({
  title: z.string().min(2, 'Meeting title is required'),
  date: z.string().transform((str) => new Date(str)),
  time: z.string().min(1, 'Time is required'),
  duration: z.string().optional().default(''),
  location: z.string().min(2, 'Location or Link is required'),
  description: z.string().optional().default(''),
  attendees: z.array(z.string()).optional().default([]),
  sendEmail: z.boolean().optional().default(false),
  category: z.string().min(1, 'Category ID is required'),
  subcategory: z.string().min(1, 'Subcategory ID is required'),
});

export const CategoryValidator = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  color: z.string().min(4, 'Category color HEX must be at least 4 characters (e.g. #3B82F6)'),
  icon: z.string().min(2, 'Category icon must be specified'),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const SubcategoryValidator = z.object({
  name: z.string().min(2, 'Subcategory name must be at least 2 characters'),
  category: z.string().min(1, 'Parent category ID is required'),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const CreateStabilityRecordValidator = z.object({
  productName: z.string().min(2, 'Product name is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  stabilityStartDate: z.string().transform((str) => new Date(str)),
  stabilityEndDate: z.string().transform((str) => new Date(str)),
  description: z.string().optional().default(''),
});

export const CompleteStabilityIntervalValidator = z.object({
  completedDate: z.string().optional().transform((str) => (str ? new Date(str) : new Date())),
  remarks: z.string().optional().default(''),
  fileName: z.string().optional().default(''),
  fileUrl: z.string().optional().default(''),
  folderPath: z.string().optional().default(''),
  actionType: z.enum(['next_interval', 'finish_study']).optional().default('next_interval'),
});

