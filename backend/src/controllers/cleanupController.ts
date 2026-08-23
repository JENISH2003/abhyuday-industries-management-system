import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import ActivityLog from '../models/ActivityLog';
import EmailLog from '../models/EmailLog';
import Certificate from '../models/Certificate';
import { AuthenticatedRequest } from '../types';

// Helper to get date cutoff based on timeframe
const getDateCutoff = (timeframe?: string): Date | null => {
  const now = new Date();
  if (timeframe === '30_days') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (timeframe === '90_days') {
    return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }
  return null;
};

// 1. Get Storage Data Counts & Overview
export const getDataStorageStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const totalActivityLogs = await ActivityLog.countDocuments({});
    const totalEmailLogs = await EmailLog.countDocuments({});
    const totalCertificates = await Certificate.countDocuments({});
    
    const now = new Date();
    const expiredCertificates = await Certificate.countDocuments({
      expiryDate: { $lt: now }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalNotifications: totalActivityLogs + totalEmailLogs,
        totalActivityLogs,
        totalEmailLogs,
        totalCertificates,
        expiredCertificates,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Purge System Notification Activity Records
export const purgeNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { ids, timeframe } = req.body;
    let query: any = {};

    if (Array.isArray(ids) && ids.length > 0) {
      query = { _id: { $in: ids } };
    } else if (timeframe && timeframe !== 'all') {
      const cutoff = getDateCutoff(timeframe);
      if (cutoff) {
        query = { timestamp: { $lt: cutoff } };
      }
    }

    const result = await ActivityLog.deleteMany(query);

    // Audit log entry
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await ActivityLog.create({
      userId: req.user?.id,
      userName: req.user?.name || 'Super Admin',
      module: 'System',
      action: 'Data Purge',
      details: `Super Admin purged ${result.deletedCount} system notification records from database.`,
      ipAddress: clientIp,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} notification records permanently from database.`,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Purge Activity Audit Logs (Selected or Timeframe)
export const purgeActivityLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { ids, timeframe } = req.body;
    let query: any = {};

    if (Array.isArray(ids) && ids.length > 0) {
      query = { _id: { $in: ids } };
    } else if (timeframe && timeframe !== 'all') {
      const cutoff = getDateCutoff(timeframe);
      if (cutoff) {
        query = { timestamp: { $lt: cutoff } };
      }
    }

    const result = await ActivityLog.deleteMany(query);

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} activity log records permanently.`,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Purge Email Logs (Selected or Timeframe)
export const purgeEmailLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { ids, timeframe } = req.body;
    let query: any = {};

    if (Array.isArray(ids) && ids.length > 0) {
      query = { _id: { $in: ids } };
    } else if (timeframe && timeframe !== 'all') {
      const cutoff = getDateCutoff(timeframe);
      if (cutoff) {
        query = { createdAt: { $lt: cutoff } };
      }
    }

    const result = await EmailLog.deleteMany(query);

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} email log records permanently.`,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Purge Certificates & File Storage (Unlinks files on disk + DB delete)
export const purgeCertificates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { ids, timeframe } = req.body;
    let query: any = {};

    if (Array.isArray(ids) && ids.length > 0) {
      query = { _id: { $in: ids } };
    } else if (timeframe === 'expired') {
      query = { expiryDate: { $lt: new Date() } };
    } else if (timeframe && timeframe !== 'all') {
      const cutoff = getDateCutoff(timeframe);
      if (cutoff) {
        query = { createdAt: { $lt: cutoff } };
      }
    }

    const certsToDelete = await Certificate.find(query);
    let freedFilesCount = 0;

    // Delete associated physical files from disk
    for (const cert of certsToDelete) {
      if (cert.fileUrl) {
        try {
          const relativePath = cert.fileUrl.startsWith('/') ? cert.fileUrl.substring(1) : cert.fileUrl;
          const absolutePath = path.join(process.cwd(), relativePath);
          if (fs.existsSync(absolutePath)) {
            await fs.promises.unlink(absolutePath);
            freedFilesCount++;
          }
        } catch (fileErr) {
          console.error(`Failed to unlink file ${cert.fileUrl}:`, fileErr);
        }
      }
    }

    const result = await Certificate.deleteMany(query);

    // Audit log entry
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await ActivityLog.create({
      userId: req.user?.id,
      userName: req.user?.name || 'Super Admin',
      module: 'System',
      action: 'Data Purge',
      details: `Super Admin purged ${result.deletedCount} certificates and freed ${freedFilesCount} physical storage files.`,
      ipAddress: clientIp,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      freedFilesCount,
      message: `Successfully deleted ${result.deletedCount} certificate records and unlinked ${freedFilesCount} files from disk.`,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Fetch Items for Manual Selection Data Purging (With Content Search)
export const getPurgeItems = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const moduleType = (req.query.module as string) || 'certificates';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 50);
    const search = ((req.query.search as string) || '').trim();

    let items: any[] = [];
    let total = 0;
    const filterQuery: any = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      if (moduleType === 'certificates') {
        filterQuery.$or = [
          { certificateNumber: regex },
          { productName: regex },
          { companyName: regex },
        ];
      } else if (moduleType === 'logs' || moduleType === 'notifications') {
        filterQuery.$or = [
          { userName: regex },
          { action: regex },
          { module: regex },
          { details: regex },
        ];
      } else if (moduleType === 'emails') {
        filterQuery.$or = [
          { recipient: regex },
          { subject: regex },
          { errorMessage: regex },
        ];
      }
    }

    if (moduleType === 'certificates') {
      total = await Certificate.countDocuments(filterQuery);
      items = await Certificate.find(filterQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('certificateNumber productName companyName expiryDate createdAt fileUrl');
    } else if (moduleType === 'logs' || moduleType === 'notifications') {
      total = await ActivityLog.countDocuments(filterQuery);
      items = await ActivityLog.find(filterQuery)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('userName module action details timestamp ipAddress');
    } else if (moduleType === 'emails') {
      total = await EmailLog.countDocuments(filterQuery);
      items = await EmailLog.find(filterQuery)
        .sort({ sentOn: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('recipient subject type status sentOn errorMessage');
    }

    res.status(200).json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};
