import { Response, NextFunction } from 'express';
import PersonalReminder from '../models/PersonalReminder';
import { AuthenticatedRequest } from '../types';

// Get all personal reminders for current user
export const getPersonalReminders = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });

    const reminders = await PersonalReminder.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reminders.length, reminders });
  } catch (error) {
    next(error);
  }
};

// Create a new personal reminder
export const createPersonalReminder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });

    const { title, description, startDate, endDate, preferredTime, notifyEmail, notifySystem } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ message: 'Title, Start Date, and End Date are required fields.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid start date or end date format.' });
    }

    if (end < start) {
      return res.status(400).json({ message: 'End Date cannot be earlier than Start Date.' });
    }

    const newReminder = new PersonalReminder({
      title: title.trim(),
      description: description ? description.trim() : '',
      startDate: start,
      endDate: end,
      preferredTime: preferredTime || '09:00 AM, 02:00 PM',
      notifyEmail: notifyEmail !== undefined ? notifyEmail : true,
      notifySystem: notifySystem !== undefined ? notifySystem : true,
      status: 'active',
      user: req.user.id,
      executionHistory: [],
    });

    await newReminder.save();

    res.status(201).json({
      success: true,
      message: 'Personal reminder created successfully',
      reminder: newReminder,
    });
  } catch (error) {
    next(error);
  }
};

// Update existing personal reminder
export const updatePersonalReminder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });

    const { id } = req.params;
    const { title, description, startDate, endDate, preferredTime, notifyEmail, notifySystem } = req.body;

    const reminder = await PersonalReminder.findOne({ _id: id, user: req.user.id });

    if (!reminder) {
      return res.status(404).json({ message: 'Personal reminder not found' });
    }

    if (title) reminder.title = title.trim();
    if (description !== undefined) reminder.description = description.trim();
    if (startDate) reminder.startDate = new Date(startDate);
    if (endDate) reminder.endDate = new Date(endDate);
    if (preferredTime) reminder.preferredTime = preferredTime;
    if (notifyEmail !== undefined) reminder.notifyEmail = notifyEmail;
    if (notifySystem !== undefined) reminder.notifySystem = notifySystem;

    await reminder.save();

    res.status(200).json({
      success: true,
      message: 'Personal reminder updated successfully',
      reminder,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Status (Pause / Resume)
export const toggleReminderStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });

    const { id } = req.params;
    const reminder = await PersonalReminder.findOne({ _id: id, user: req.user.id });

    if (!reminder) {
      return res.status(404).json({ message: 'Personal reminder not found' });
    }

    reminder.status = reminder.status === 'active' ? 'paused' : 'active';
    await reminder.save();

    res.status(200).json({
      success: true,
      message: `Reminder status set to ${reminder.status}`,
      status: reminder.status,
    });
  } catch (error) {
    next(error);
  }
};

// Delete personal reminder
export const deletePersonalReminder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });

    const { id } = req.params;
    const reminder = await PersonalReminder.findOneAndDelete({ _id: id, user: req.user.id });

    if (!reminder) {
      return res.status(404).json({ message: 'Personal reminder not found' });
    }

    res.status(200).json({ success: true, message: 'Personal reminder deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Manual "Run Now" trigger endpoint
export const triggerReminderNow = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });

    const { id } = req.params;
    const query: any = { _id: id };
    if (req.user.role !== 'super_admin') {
      query.user = req.user.id;
    }

    const reminder = await PersonalReminder.findOne(query).populate('user', 'name email');

    if (!reminder) {
      return res.status(404).json({ message: 'Personal reminder not found' });
    }

    const { checkPersonalReminders } = await import('../services/personalReminderService');
    await checkPersonalReminders('Manual Trigger', id);

    const updated = await PersonalReminder.findById(id);

    res.status(200).json({
      success: true,
      message: 'Reminder triggered successfully! Check execution log and notifications.',
      reminder: updated,
    });
  } catch (error) {
    next(error);
  }
};
