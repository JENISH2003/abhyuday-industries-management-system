import PersonalReminder from '../models/PersonalReminder';
import ActivityLog from '../models/ActivityLog';
import User from '../models/User';
import { sendMail } from './emailService';

export const checkPersonalReminders = async (
  slotLabel: '09:00 AM' | '02:00 PM' | 'Manual Trigger' = '09:00 AM',
  targetReminderId?: string
) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    let activeReminders: any[] = [];

    if (targetReminderId) {
      // Direct manual trigger for a specific reminder
      const target = await PersonalReminder.findById(targetReminderId).populate('user', 'name email');
      if (target) {
        activeReminders = [target];
      }
    } else {
      // Find all active personal reminders where startDate <= endOfToday AND endDate >= today
      activeReminders = await PersonalReminder.find({
        status: 'active',
        startDate: { $lte: endOfToday },
        endDate: { $gte: today },
      }).populate('user', 'name email');
    }

    console.log(`[PERSONAL REMINDERS] Firing check (${slotLabel}). Found ${activeReminders.length} reminder(s).`);

    for (const reminder of activeReminders) {
      let userObj: any = reminder.user;
      let recipientEmail = userObj?.email;
      let userName = userObj?.name;

      if (!recipientEmail && reminder.user) {
        const foundUser = await User.findById(reminder.user);
        if (foundUser) {
          recipientEmail = foundUser.email;
          userName = foundUser.name;
          userObj = foundUser;
        }
      }

      if (!userName) userName = 'User';

      // Deduplication Guard: Skip if alert for this slot was already sent today (unless Manual Trigger)
      if (slotLabel !== 'Manual Trigger' && reminder.executionHistory?.length) {
        const alreadySentToday = reminder.executionHistory.some((entry: any) => {
          const entryDate = new Date(entry.triggeredAt);
          const isSameDay =
            entryDate.getFullYear() === today.getFullYear() &&
            entryDate.getMonth() === today.getMonth() &&
            entryDate.getDate() === today.getDate();
          return isSameDay && entry.slot === slotLabel && entry.status === 'sent';
        });

        if (alreadySentToday) {
          console.log(`[PERSONAL REMINDERS] Skipping "${reminder.title}" — ${slotLabel} alert already delivered today.`);
          continue;
        }
      }

      let emailSent = false;
      let emailAttempted = false;

      // 1. Send Email Notification if enabled OR if Manual Trigger
      if ((reminder.notifyEmail || slotLabel === 'Manual Trigger') && recipientEmail) {
        emailAttempted = true;
        const subject = `🔔 Personal Reminder: ${reminder.title} (${slotLabel})`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #00c853; padding-bottom: 12px;">
              <h2 style="color: #00a844; margin: 0; font-size: 22px;">Abhyuday Personal Reminder System</h2>
              <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Automated Alert • ${slotLabel}</p>
            </div>

            <p style="color: #334155; font-size: 15px;">Hello <strong>${userName}</strong>,</p>
            <p style="color: #334155; font-size: 14px;">This is your personal reminder alert:</p>

            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 18px;">${reminder.title}</h3>
              ${reminder.description ? `<p style="margin: 0; color: #15803d; font-size: 14px; line-height: 1.5;">${reminder.description}</p>` : ''}
              <div style="margin-top: 12px; font-size: 12px; color: #166534;">
                <span>🗓️ Valid: <strong>${new Date(reminder.startDate).toLocaleDateString()}</strong> to <strong>${new Date(reminder.endDate).toLocaleDateString()}</strong></span>
              </div>
            </div>

            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 24px;">
              You are receiving this automated alert because you scheduled a personal reminder in Abhyuday Management System.
            </p>
          </div>
        `;

        try {
          const sent = await sendMail(recipientEmail, subject, 'bulk_summary', html);
          emailSent = sent;
        } catch (err: any) {
          console.error(`[PERSONAL REMINDERS] Email delivery failed for ${recipientEmail}: ${err.message}`);
        }
      }

      // 2. Audit / Activity Log if enabled
      if (reminder.notifySystem) {
        await ActivityLog.create({
          userId: userObj?._id || reminder.user,
          userName: userName,
          module: 'System',
          action: 'Personal Reminder Triggered',
          details: `Personal reminder "${reminder.title}" executed (${slotLabel}). Email status: ${emailSent ? 'Delivered' : emailAttempted ? 'Delivery Failed (SMTP)' : 'Disabled'}.`,
          ipAddress: '127.0.0.1',
          timestamp: new Date(),
        });
      }

      // 3. Record Execution Log with exact status
      let logStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
      let logDetails = `Processed (${slotLabel})`;

      if (emailSent) {
        logStatus = 'sent';
        logDetails = `Email delivered to ${recipientEmail}`;
      } else if (emailAttempted) {
        logStatus = 'failed';
        logDetails = `Email dispatch failed (Check SMTP credentials)`;
      } else {
        logStatus = 'skipped';
        logDetails = `Email notification disabled by user`;
      }

      reminder.lastTriggeredAt = new Date();
      reminder.executionHistory.push({
        triggeredAt: new Date(),
        slot: slotLabel,
        status: logStatus,
        details: logDetails,
      });

      // Auto-complete ONLY after the end date has fully passed
      const reminderEndDateEndOfDay = new Date(reminder.endDate);
      reminderEndDateEndOfDay.setHours(23, 59, 59, 999);

      if (reminderEndDateEndOfDay < today) {
        reminder.status = 'completed';
      }

      await reminder.save();
    }
  } catch (error: any) {
    console.error(`[PERSONAL REMINDERS] Error during automated check:`, error.message);
  }
};
