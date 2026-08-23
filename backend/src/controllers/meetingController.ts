import { Response, NextFunction } from 'express';
import Meeting from '../models/Meeting';
import User from '../models/User';
import { MeetingValidator } from '../validators';
import { AuthenticatedRequest } from '../types';
import { sendMail } from '../services/emailService';
import { getMeetingEmailTemplate } from '../emails/template';
import { checkMeetingReminders } from '../services/meetingReminderService';

export const createMeeting = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedBody = MeetingValidator.parse(req.body);

    const meeting = new Meeting({
      ...validatedBody,
      createdBy: req.user?.id,
    });

    await meeting.save();

    // Trigger immediate email evaluation & invitation if sendEmail is enabled
    if (validatedBody.sendEmail && validatedBody.attendees && validatedBody.attendees.length > 0) {
      process.nextTick(async () => {
        try {
          const organizer = await User.findById(req.user?.id);
          const organizerName = organizer?.name || 'Compliance Manager';

          const users = await User.find({ _id: { $in: validatedBody.attendees } });
          const emails = users.map((u) => u.email).filter(Boolean);

          const formattedDate = new Date(validatedBody.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          const subject = `[Abhyuday Meeting] Invitation: "${validatedBody.title}"`;
          const htmlContent = getMeetingEmailTemplate(
            validatedBody.title,
            formattedDate,
            validatedBody.time,
            validatedBody.duration,
            validatedBody.location,
            validatedBody.description || '',
            organizerName,
            'invitation'
          );

          for (const email of emails) {
            await sendMail(email, subject, 'meeting_reminder', htmlContent);
          }

          // Evaluate 2-time morning & mentioned time reminders
          await checkMeetingReminders();
        } catch (err: any) {
          console.error(`Failed to send meeting notification emails: ${err.message}`);
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Meeting scheduled successfully',
      meeting,
    });
  } catch (error) {
    next(error);
  }
};

export const getMeetings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const query: any = {};
    if (req.user?.role !== 'super_admin') {
      query.$or = [
        { createdBy: req.user?.id },
        { attendees: req.user?.id },
      ];
    }

    const meetings = await Meeting.find(query)
      .populate('attendees', 'name email role')
      .populate('createdBy', 'name email')
      .populate('category', 'name color icon')
      .populate('subcategory', 'name')
      .sort({ date: 1, time: 1 });

    res.status(200).json({
      success: true,
      meetings,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMeeting = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    await Meeting.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
