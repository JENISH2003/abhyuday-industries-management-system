import Meeting from '../models/Meeting';
import User from '../models/User';
import { sendMail } from './emailService';
import { getMeetingEmailTemplate } from '../emails/template';

/**
 * Dispatches meeting emails for a specific meeting and type ('morning' or 'time')
 */
export const dispatchMeetingNotification = async (
  meetingId: string,
  emailType: 'morning' | 'time'
): Promise<boolean> => {
  try {
    const meeting = await Meeting.findById(meetingId)
      .populate('attendees', 'email name')
      .populate('createdBy', 'name email');

    if (!meeting || !meeting.sendEmail) return false;

    const attendeesList = (meeting.attendees as any[]) || [];
    const emails = attendeesList.map((u) => u.email).filter(Boolean);

    if (emails.length === 0) return false;

    const organizerName =
      meeting.createdBy && typeof meeting.createdBy === 'object' && 'name' in meeting.createdBy
        ? (meeting.createdBy as any).name
        : 'Compliance Manager';

    const formattedDate = new Date(meeting.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject =
      emailType === 'morning'
        ? `[Morning Reminder] Meeting Today: "${meeting.title}" at ${meeting.time}`
        : `[Meeting Starting Now] Compliance discussion: "${meeting.title}"`;

    const htmlContent = getMeetingEmailTemplate(
      meeting.title,
      formattedDate,
      meeting.time,
      meeting.duration,
      meeting.location,
      meeting.description || '',
      organizerName,
      emailType
    );

    let count = 0;
    for (const email of emails) {
      const sent = await sendMail(email, subject, 'meeting_reminder', htmlContent);
      if (sent) count++;
    }

    console.log(
      `[MEETING REMINDER WORKER] Sent ${emailType.toUpperCase()} meeting email for "${meeting.title}" to ${count} recipients.`
    );
    return true;
  } catch (err: any) {
    console.error(`[MEETING REMINDER ERROR] Failed dispatching ${emailType} email: ${err.message}`);
    return false;
  }
};

/**
 * Periodically checks all upcoming meetings and triggers:
 * 1. Morning email on the morning of the meeting date
 * 2. Mentioned-time email when the exact scheduled meeting time is reached
 */
export const checkMeetingReminders = async (): Promise<void> => {
  try {
    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    // TEMPORARILY DISABLED DEDUPLICATION GUARD FOR TESTING (Can be re-enabled upon request)
    // Get meetings where sendEmail is true
    const pendingMeetings = await Meeting.find({
      sendEmail: true,
      // /* $or: [{ morningEmailSent: false }, { timeEmailSent: false }] */
    });

    for (const meeting of pendingMeetings) {
      const meetingDate = new Date(meeting.date);

      const isSameDay =
        meetingDate.getFullYear() === now.getFullYear() &&
        meetingDate.getMonth() === now.getMonth() &&
        meetingDate.getDate() === now.getDate();

      const isPastDay = meetingDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 1. MORNING REMINDER (Runs on the morning of meeting day)
      if (/* !meeting.morningEmailSent && */ (isSameDay || isPastDay)) {
        const success = await dispatchMeetingNotification(meeting._id.toString(), 'morning');
        if (success) {
          meeting.morningEmailSent = true;
          await meeting.save();
        }
      }

      // 2. MENTIONED TIME REMINDER (Runs when currentTimeStr >= meeting.time on meeting date)
      if (/* !meeting.timeEmailSent && */ (isSameDay || isPastDay)) {
        let shouldTriggerTimeEmail = false;

        if (isSameDay) {
          // Compare HH:mm string (e.g., "14:30" <= "15:00")
          if (currentTimeStr >= meeting.time) {
            shouldTriggerTimeEmail = true;
          }
        } else if (isPastDay) {
          shouldTriggerTimeEmail = true;
        }

        if (shouldTriggerTimeEmail) {
          const success = await dispatchMeetingNotification(meeting._id.toString(), 'time');
          if (success) {
            meeting.timeEmailSent = true;
            await meeting.save();
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`[MEETING REMINDER CRON ERROR] ${err.message}`);
  }
};
