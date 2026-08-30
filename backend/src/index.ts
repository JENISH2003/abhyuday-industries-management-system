import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { config } from './config/env';
import { connectDB } from './database/connection';
import { initScheduler } from './cron/scheduler';
import { auditLogger } from './middlewares/logMiddleware';
import { errorHandler } from './middlewares/errorMiddleware';

// Import Routes
import authRoutes from './routes/authRoutes';
import certificateRoutes from './routes/certificateRoutes';
import meetingRoutes from './routes/meetingRoutes';
import userRoutes from './routes/userRoutes';
import logRoutes from './routes/logRoutes';
import backupRoutes from './routes/backupRoutes';
import categoryRoutes from './routes/categoryRoutes';
import subcategoryRoutes from './routes/subcategoryRoutes';
import emailSettingRoutes from './routes/emailSettingRoutes';
import stabilityRoutes from './routes/stabilityRoutes';
import cleanupRoutes from './routes/cleanupRoutes';
import personalReminderRoutes from './routes/personalReminderRoutes';
import cronRoutes from './routes/cronRoutes';

import fs from 'fs';

const app = express();
app.set('trust proxy', 1);

// Ensure uploads directory exists on server startup
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required for local/remote file retrieval across origins
}));

// Enable CORS with credentials and flexible origin matching for Render / local dev
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('.onrender.com') || origin === config.FRONTEND_URL) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Prevent NoSQL query injection
app.use(mongoSanitize());

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Stricter Rate Limiting for Auth login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'production' ? 15 : 200,
  message: { message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Direct fail-safe API trigger endpoint for GitHub Actions
app.all('/api/cron/dispatch', async (req: express.Request, res: express.Response) => {
  try {
    const providedSecret = req.headers['x-cron-secret'] || req.query.secret;
    const expectedSecret = config.CRON_SECRET;

    if (expectedSecret && providedSecret !== expectedSecret) {
      res.status(401).json({ success: false, message: 'Unauthorized: Invalid cron secret token' });
      return;
    }

    const slot = (req.query.slot as string) || (req.body?.slot as string) || '09:00 AM';
    console.log(`[CRON DIRECT API TRIGGER] Received trigger for slot: ${slot}`);

    const { checkCertificatesCompliance } = await import('./services/complianceService');
    const { checkMeetingReminders } = await import('./services/meetingReminderService');
    const { checkStabilityCompliance } = await import('./services/stabilityService');
    const { checkPersonalReminders } = await import('./services/personalReminderService');

    if (slot === '09:00 AM' || slot === 'morning' || slot === 'all' || slot === '02:00 PM' || slot === 'afternoon') {
      await checkCertificatesCompliance();
      await checkStabilityCompliance();
      await checkPersonalReminders('09:00 AM');
      await checkMeetingReminders();
    } else {
      await checkMeetingReminders();
    }

    res.status(200).json({
      success: true,
      message: `Cron email dispatch triggered successfully for slot: ${slot}`,
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CRON DIRECT TRIGGER ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to execute cron email dispatch', error: error.message });
  }
});

// Audit Logger Middleware for mutating states
app.use(auditLogger);

// API routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/db', backupRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/settings/email', emailSettingRoutes);
app.use('/api/stability', stabilityRoutes);
app.use('/api/settings/cleanup', cleanupRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/personal-reminders', personalReminderRoutes);

// Health check endpoint (supports both /health and /api/health)
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date(), env: config.NODE_ENV });
});

// Serve frontend static build assets if dist directory exists (Single Fullstack Service mode)
const possibleFrontendPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
];

const frontendDistPath = possibleFrontendPaths.find((p) => fs.existsSync(p));

if (frontendDistPath) {
  console.log(`[SERVE] Serving production static frontend build from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res, next) => {
    if (
      req.originalUrl.startsWith('/api') ||
      req.originalUrl.startsWith('/uploads') ||
      req.originalUrl === '/health' ||
      req.originalUrl === '/api/health'
    ) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  console.warn('[SERVE] WARNING: Frontend dist directory not found. Serving fallback API status for root /');
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'Abhyuday Management System API',
      status: 'Online',
      timestamp: new Date(),
      message: 'Backend server is running successfully.',
    });
  });
}

// 404 Handler for unhandled API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API route ${req.originalUrl} not found` });
});

// Global Error Handler Middleware
app.use(errorHandler);

// Connect Database & Run Server
const startServer = async () => {
  await connectDB();
  
  app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Abhyuday Management System Backend running on port ${config.PORT} in ${config.NODE_ENV} mode`);
    
    // Start Cron Schedulers
    initScheduler();
  });
};

startServer().catch((error) => {
  console.error('CRITICAL: Server startup failed:', error);
  process.exit(1);
});
