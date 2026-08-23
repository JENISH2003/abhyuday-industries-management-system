import cron from 'node-cron';
import { checkCertificatesCompliance } from '../services/complianceService';
import { checkMeetingReminders } from '../services/meetingReminderService';
import { checkStabilityCompliance } from '../services/stabilityService';
import { checkPersonalReminders } from '../services/personalReminderService';
import ActivityLog from '../models/ActivityLog';
import EmailLog from '../models/EmailLog';

export const initScheduler = (): void => {
  console.log('[SCHEDULER] Initializing background cron jobs...');

  // Run certificate compliance & stability checks every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('[SCHEDULER] Triggering daily certificate compliance & stability checks...');
    await checkCertificatesCompliance();
    await checkStabilityCompliance();
  });

  // Run daily 1-day log purge at 01:00 AM to keep 512MB database space optimized for life
  cron.schedule('0 1 * * *', async () => {
    try {
      console.log('[SCHEDULER] Running daily 1-day activity & email log purge...');
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const actRes = await ActivityLog.deleteMany({
        $or: [
          { timestamp: { $lt: oneDayAgo } },
          { createdAt: { $lt: oneDayAgo } }
        ]
      });
      const emailRes = await EmailLog.deleteMany({
        $or: [
          { sentOn: { $lt: oneDayAgo } },
          { createdAt: { $lt: oneDayAgo } }
        ]
      });
      console.log(`[SCHEDULER] 1-Day log purge complete. Removed ${actRes.deletedCount} activity logs and ${emailRes.deletedCount} email logs.`);
    } catch (err) {
      console.error('[SCHEDULER] Error during 1-day log purge:', err);
    }
  });

  // Run Personal Reminders 2 times daily: 9:00 AM & 2:00 PM
  cron.schedule('0 9 * * *', async () => {
    console.log('[SCHEDULER] Triggering 9:00 AM Personal Reminders check...');
    await checkPersonalReminders('09:00 AM');
  });

  cron.schedule('0 14 * * *', async () => {
    console.log('[SCHEDULER] Triggering 2:00 PM Personal Reminders check...');
    await checkPersonalReminders('02:00 PM');
  });

  // Run meeting reminder checks every minute for 2-time notifications (morning & mentioned time)
  cron.schedule('* * * * *', async () => {
    await checkMeetingReminders();
  });

  // Run once immediately on server startup for demonstration/sync purposes
  setTimeout(async () => {
    console.log('[SCHEDULER] Running initial startup compliance, meeting, & stability checks...');
    await checkCertificatesCompliance();
    await checkMeetingReminders();
    await checkStabilityCompliance();
  }, 5000); // Wait 5 seconds after server start to allow DB/mailer setup
};
