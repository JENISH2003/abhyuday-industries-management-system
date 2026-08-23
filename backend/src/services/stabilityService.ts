import StabilityRecord from '../models/StabilityRecord';
import { sendMail } from './emailService';
import { getStabilityEmailTemplate } from '../emails/template';

/**
 * Background worker that checks ongoing 3-month stability studies and triggers:
 * 1. Email 1 Day Before Due Date ("Upcoming Stability Study Reminder")
 * 2. Email On Due Date ("Stability Study Due Today")
 * 
 * STRICT RECIPIENT RULE: Emails are dispatched ONLY to the user account that
 * registered/owns the stability study (record.createdBy.email).
 */
export const checkStabilityCompliance = async (): Promise<void> => {
  console.log('[STABILITY WORKER] Starting stability reminder checks...');
  try {
    const ongoingRecords = await StabilityRecord.find({ status: 'ongoing' })
      .populate('createdBy', 'email name role');

    let alertsSentCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const record of ongoingRecords) {
      if (!record.currentDueDate) continue;

      const dueDate = new Date(record.currentDueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Target RECIPIENT: ONLY the user account that registered this stability record
      const ownerEmail =
        record.createdBy && typeof record.createdBy === 'object' && 'email' in record.createdBy
          ? (record.createdBy as any).email
          : null;

      if (!ownerEmail) continue;

      const formattedDueDate = new Date(record.currentDueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // 1. ONE DAY BEFORE REMINDER
      if (diffDays === 1 && !record.sentOneDayBefore) {
        const subject = `[Upcoming Stability Reminder] ${record.currentIntervalLabel} Study for ${record.productName}`;
        const htmlBody = getStabilityEmailTemplate(
          record.productName,
          record.batchNumber,
          record.currentIntervalLabel,
          formattedDueDate,
          'one_day_before'
        );

        const sent = await sendMail(ownerEmail, subject, 'expiry_alert', htmlBody);
        if (sent) alertsSentCount++;

        record.sentOneDayBefore = true;
        await record.save();
      }

      // 2. ON DUE DATE REMINDER (or overdue)
      if (diffDays <= 0 && !record.sentOnDueDate) {
        const subject = `[Stability Study Due Today] ${record.currentIntervalLabel} Study for ${record.productName}`;
        const htmlBody = getStabilityEmailTemplate(
          record.productName,
          record.batchNumber,
          record.currentIntervalLabel,
          formattedDueDate,
          'due_today'
        );

        const sent = await sendMail(ownerEmail, subject, 'expiry_alert', htmlBody);
        if (sent) alertsSentCount++;

        record.sentOnDueDate = true;
        await record.save();
      }
    }

    console.log(`[STABILITY WORKER] Completed stability checks. Dispatched ${alertsSentCount} owner email reminders.`);
  } catch (error: any) {
    console.error(`[STABILITY WORKER ERROR] Failed during stability checks: ${error.message}`);
  }
};
