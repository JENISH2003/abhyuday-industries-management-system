import { Request, Response } from 'express';
import { checkCertificatesCompliance } from '../services/complianceService';
import { checkMeetingReminders } from '../services/meetingReminderService';
import { checkStabilityCompliance } from '../services/stabilityService';
import { checkPersonalReminders } from '../services/personalReminderService';
import { config } from '../config/env';

export const dispatchDailyEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const providedSecret = req.headers['x-cron-secret'] || req.query.secret;
    const expectedSecret = config.CRON_SECRET;

    if (expectedSecret && providedSecret !== expectedSecret) {
      res.status(401).json({ success: false, message: 'Unauthorized: Invalid cron secret token' });
      return;
    }

    const slot = (req.query.slot as string) || (req.body?.slot as string) || '09:00 AM';

    console.log(`[CRON API TRIGGER] Received external HTTP cron trigger for slot: ${slot}...`);

    const details: string[] = [];

    if (slot === '09:00 AM' || slot === 'morning' || slot === 'all' || slot === '02:00 PM' || slot === 'afternoon') {
      await checkCertificatesCompliance();
      await checkStabilityCompliance();
      await checkPersonalReminders('09:00 AM');
      await checkMeetingReminders();
      details.push('Executed 09:00 AM morning compliance & personal reminders');
    } else {
      await checkMeetingReminders();
      details.push('Executed meeting reminders check');
    }

    res.status(200).json({
      success: true,
      message: `Cron email dispatch triggered successfully for slot: ${slot}`,
      executedAt: new Date().toISOString(),
      details,
    });
  } catch (error: any) {
    console.error('[CRON API TRIGGER ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute cron email dispatch',
      error: error.message,
    });
  }
};
