import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Certificate from '../models/Certificate';
import Meeting from '../models/Meeting';
import EmailLog from '../models/EmailLog';
import ActivityLog from '../models/ActivityLog';
import Category from '../models/Category';
import Subcategory from '../models/Subcategory';

export const backupDatabase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find({});
    const certificates = await Certificate.find({});
    const meetings = await Meeting.find({});
    const emailLogs = await EmailLog.find({});
    const activityLogs = await ActivityLog.find({});
    const categories = await Category.find({});
    const subcategories = await Subcategory.find({});

    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      data: {
        users,
        certificates,
        meetings,
        emailLogs,
        activityLogs,
        categories,
        subcategories,
      },
    };

    res.setHeader('Content-disposition', `attachment; filename=abhyuday_backup_${Date.now()}.json`);
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(backupData, null, 2));
    res.end();
  } catch (error) {
    next(error);
  }
};

export const restoreDatabase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Backup JSON file is required' });
    }

    const backupFilePath = req.file.path;
    const fileContent = require('fs').readFileSync(backupFilePath, 'utf8');
    const parsedData = JSON.parse(fileContent);

    // Clean up uploaded file
    require('fs').unlinkSync(backupFilePath);

    if (!parsedData.data || !parsedData.data.users || !parsedData.data.certificates) {
      return res.status(400).json({ message: 'Invalid backup file structure' });
    }

    const { users, certificates, meetings, emailLogs, activityLogs, categories, subcategories } = parsedData.data;

    // Restore Collections
    // 1. Categories & Subcategories first (since others reference them)
    await Category.deleteMany({});
    if (categories && categories.length > 0) {
      await Category.insertMany(categories);
    }

    await Subcategory.deleteMany({});
    if (subcategories && subcategories.length > 0) {
      await Subcategory.insertMany(subcategories);
    }

    // 2. Users
    if (users && users.length > 0) {
      // Store current user ID to prevent losing active session
      const activeUserEmail = (req as any).user?.email;

      await User.deleteMany({ email: { $ne: activeUserEmail } });
      
      // Filter out any duplicates of the active user to avoid collision
      const otherUsers = users.filter((u: any) => u.email !== activeUserEmail);
      if (otherUsers.length > 0) {
        await User.insertMany(otherUsers);
      }
    }

    // 3. Certificates
    await Certificate.deleteMany({});
    if (certificates && certificates.length > 0) {
      await Certificate.insertMany(certificates);
    }

    // 4. Meetings
    await Meeting.deleteMany({});
    if (meetings && meetings.length > 0) {
      await Meeting.insertMany(meetings);
    }

    // 5. Email Logs
    await EmailLog.deleteMany({});
    if (emailLogs && emailLogs.length > 0) {
      await EmailLog.insertMany(emailLogs);
    }

    // 6. Activity Logs (Wipe clean and insert history)
    await ActivityLog.deleteMany({});
    if (activityLogs && activityLogs.length > 0) {
      await ActivityLog.insertMany(activityLogs);
    }

    res.status(200).json({
      success: true,
      message: 'Database backup restored successfully',
      restoredCounts: {
        users: users?.length || 0,
        certificates: certificates?.length || 0,
        meetings: meetings?.length || 0,
        emailLogs: emailLogs?.length || 0,
        activityLogs: activityLogs?.length || 0,
        categories: categories?.length || 0,
        subcategories: subcategories?.length || 0,
      },
    });
  } catch (error: any) {
    next(new Error(`Failed to restore backup: ${error.message}`));
  }
};
