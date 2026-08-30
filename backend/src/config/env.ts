import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/abhyuday_management',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_access_key_123456789_dont_share',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_987654321_dont_share',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || 'jenishkpatel2003@gmail.com',
  SUPERADMIN_PASSWORD: process.env.SUPERADMIN_PASSWORD || 'Jenish@2004',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || process.env.EMAIL_USER || 'jenishkpatel2003@gmail.com',
  SMTP_PASS: process.env.SMTP_PASS || process.env.EMAIL_PASS || 'jmyxbrqlziqumhec',
  SMTP_FROM: process.env.SMTP_FROM || '"Abhyuday Management System" <jenishkpatel2003@gmail.com>',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CRON_SECRET: process.env.CRON_SECRET || 'abhyuday_cron_secret_key_2026',
};

// Simple sanity check
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('WARNING: JWT_SECRET or JWT_REFRESH_SECRET is not set in environment. Using fallback secrets.');
}
