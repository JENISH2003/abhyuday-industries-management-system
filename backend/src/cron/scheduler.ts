import cron from 'node-cron';
import { checkCertificatesCompliance } from '../services/complianceService';
import { checkMeetingReminders } from '../services/meetingReminderService';
import { checkStabilityCompliance } from '../services/stabilityService';
import { checkPersonalReminders } from '../services/personalReminderService';
import ActivityLog from '../models/ActivityLog';
import EmailLog from '../models/EmailLog';

export const initScheduler = (): void => {
  console.log('[SCHEDULER] Initializing background cron jobs (Daily 9:00 AM IST dispatch)...');

  // Daily 9:00 AM Master Email Dispatch: Certificates, Stability, Personal Reminders, & Morning Meetings
  cron.schedule(
    '0 9 * * *',
    async () => {
      console.log('[SCHEDULER 09:00 AM IST] Triggering daily morning email notifications...');
      await checkCertificatesCompliance();
      await checkStabilityCompliance();
      await checkPersonalReminders('09:00 AM');
      await checkMeetingReminders();
    },
    { timezone: 'Asia/Kolkata' }
  );

  // Run daily 1-day log purge at 01:00 AM to keep database space optimized
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

  // Per-minute check for exact meeting scheduled time alerts
  cron.schedule('* * * * *', async () => {
    await checkMeetingReminders();
  });

  // Run once on server startup for sync
  setTimeout(async () => {
    console.log('[SCHEDULER] Running initial startup compliance, meeting, & stability checks...');
    await checkCertificatesCompliance();
    await checkMeetingReminders();
    await checkStabilityCompliance();
  }, 5000);
};
