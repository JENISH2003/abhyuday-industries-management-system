import { Response, NextFunction } from 'express';
import ActivityLog from '../models/ActivityLog';
import EmailLog from '../models/EmailLog';
import { AuthenticatedRequest } from '../types';

export const getActivityLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { module, search } = req.query;

    const query: any = {};

    if (module && module !== 'all') {
      query.module = { $regex: new RegExp(`^${module}`, 'i') };
    }

    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEmailLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const total = await EmailLog.countDocuments();
    const logs = await EmailLog.find()
      .sort({ sentOn: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const sendTestEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { recipient, subject, body, type } = req.body;
    if (!recipient || !subject || !body || !type) {
      return res.status(400).json({ message: 'All parameters (recipient, subject, body, type) are required' });
    }

    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #3b82f6;">Abhyuday Management System Test Dispatcher</h2>
        <p>This is a manual SMTP test alert dispatched by a system administrator.</p>
        <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <strong>Message Body:</strong>
          <p style="white-space: pre-wrap; margin-top: 5px;">${body}</p>
        </div>
        <span style="font-size: 11px; color: #9ca3af;">Notification Category: ${type}</span>
      </div>
    `;

    const sendMail = require('../services/emailService').sendMail;
    const success = await sendMail(recipient, subject, type, htmlContent);

    if (success) {
      res.status(200).json({ success: true, message: 'Test email successfully sent' });
    } else {
      res.status(500).json({ success: false, message: 'SMTP email delivery failed' });
    }
  } catch (error) {
    next(error);
  }
};

export const deleteActivityLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const log = await ActivityLog.findByIdAndDelete(id);
    if (!log) {
      return res.status(404).json({ message: 'Activity log record not found' });
    }

    res.status(200).json({ success: true, message: 'Activity log record deleted permanently from database' });
  } catch (error) {
    next(error);
  }
};

export const deleteEmailLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const log = await EmailLog.findByIdAndDelete(id);
    if (!log) {
      return res.status(404).json({ message: 'Email log record not found' });
    }

    res.status(200).json({ success: true, message: 'Email log record deleted permanently from database' });
  } catch (error) {
    next(error);
  }
};

export const clearAllActivityLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ActivityLog.deleteMany({});
    res.status(200).json({ success: true, message: `All ${result.deletedCount} activity logs cleared permanently` });
  } catch (error) {
    next(error);
  }
};

export const clearAllEmailLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await EmailLog.deleteMany({});
    res.status(200).json({ success: true, message: `All ${result.deletedCount} email logs cleared permanently` });
  } catch (error) {
    next(error);
  }
};

