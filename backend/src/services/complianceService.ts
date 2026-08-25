import Certificate from '../models/Certificate';
import User from '../models/User';
import { sendMail } from './emailService';
import { getExpirationEmailTemplate } from '../emails/template';

export const checkCertificatesCompliance = async (): Promise<void> => {
  console.log('[COMPLIANCE WORKER] Starting compliance check...');
  try {
    const certificates = await Certificate.find().populate('createdBy');

    let updatedCount = 0;
    let alertsSentCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const cert of certificates) {
      const expiry = new Date(cert.expiryDate);
      expiry.setHours(0, 0, 0, 0);

      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let targetStatus: 'active' | 'expiring_soon' | 'expired' = 'active';

      if (diffDays <= 0) {
        targetStatus = 'expired';
      } else if (diffDays <= 90) {
        targetStatus = 'expiring_soon';
      }

      // Update status if it changed
      if (cert.status !== targetStatus) {
        cert.status = targetStatus;
        await cert.save();
        updatedCount++;
      }

      // If certificate is marked as resolved (Done), suppress automated email alerts
      if (cert.isResolved) {
        continue;
      }

      // Determine exact milestone key for email alert (30 Days Left, 7 Days Left, 1 Day Left, Expiry Date)
      let milestoneKey: string | null = null;
      if (diffDays <= 0) {
        milestoneKey = '0'; // On or after expiry date (Expired)
      } else if (diffDays === 1) {
        milestoneKey = '1'; // 1 day before expiry (Tomorrow)
      } else if (diffDays === 7) {
        milestoneKey = '7'; // 7 days before expiry
      } else if (diffDays === 30) {
        milestoneKey = '30'; // 30 days before expiry
      } else if (diffDays < 30 && diffDays > 7 && (!cert.sentMilestones || !cert.sentMilestones.includes('30'))) {
        milestoneKey = '30'; // Catches certificates entering the 30-day window
      } else if (diffDays < 7 && diffDays > 1 && (!cert.sentMilestones || !cert.sentMilestones.includes('7'))) {
        milestoneKey = '7'; // Catches certificates entering the 7-day window
      }

      // TEMPORARILY DISABLED DEDUPLICATION GUARD FOR TESTING (Can be re-enabled upon request)
      // Original: if (!milestoneKey || (cert.sentMilestones && cert.sentMilestones.includes(milestoneKey))) { continue; }
      if (!milestoneKey) {
        continue;
      }

      // Check if certificate belongs to Super Admin
      const isSuperAdminCert =
        cert.createdBy &&
        typeof cert.createdBy === 'object' &&
        'role' in cert.createdBy &&
        (cert.createdBy as any).role === 'super_admin';

      let recipientEmails: string[] = [];

      if (isSuperAdminCert) {
        // SUPER ADMIN RULE: Broadcast reminder to EVERY registered user in the system (including Super Admin)
        const allActiveUsers = await User.find({ status: 'active' }).select('email');
        recipientEmails = Array.from(new Set(allActiveUsers.map((u) => u.email).filter(Boolean)));
        console.log(`[COMPLIANCE WORKER] Super Admin certificate "${cert.name}" alert broadcast to ${recipientEmails.length} users.`);
      } else {
        // NORMAL USER RULE: Send reminder email to Owner's registered email AND Super Admin
        const ownerEmail = cert.createdBy && typeof cert.createdBy === 'object' && 'email' in cert.createdBy
          ? (cert.createdBy as any).email
          : null;
        
        const superAdmin = await User.findOne({ role: 'super_admin' });
        const superAdminEmail = superAdmin?.email;

        recipientEmails = Array.from(new Set([ownerEmail, superAdminEmail].filter(Boolean)));
        console.log(`[COMPLIANCE WORKER] Normal user certificate "${cert.name}" alert sent to Owner (${ownerEmail}) & Super Admin (${superAdminEmail}).`);
      }

      if (recipientEmails.length > 0) {
        let subject = `[Abhyuday Alert] Certificate "${cert.name}" Expiry Notice`;
        if (milestoneKey === '30') {
          subject = `[Abhyuday Alert] Certificate "${cert.name}" Expiring in 30 Days`;
        } else if (milestoneKey === '7') {
          subject = `[Abhyuday Alert] Certificate "${cert.name}" Expiring in 7 Days`;
        } else if (milestoneKey === '1') {
          subject = `[Abhyuday Alert] Certificate "${cert.name}" Expiring Tomorrow`;
        } else if (milestoneKey === '0') {
          subject = `[Abhyuday Alert] Certificate "${cert.name}" Has Expired`;
        }

        const formattedExpiry = new Date(cert.expiryDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const htmlBody = getExpirationEmailTemplate(
          cert.name,
          cert.certificateNo,
          cert.issuingAuthority,
          formattedExpiry,
          diffDays,
          targetStatus
        );

        // Dispatch emails to all target recipients
        let batchSuccessCount = 0;
        for (const email of recipientEmails) {
          const sent = await sendMail(email, subject, 'expiry_alert', htmlBody);
          if (sent) batchSuccessCount++;
        }

        alertsSentCount += batchSuccessCount;

        // Record milestone in certificate sentMilestones to prevent duplicate alerts
        if (!cert.sentMilestones) {
          cert.sentMilestones = [];
        }
        cert.sentMilestones.push(milestoneKey);
        await cert.save();
      }
    }

    console.log(`[COMPLIANCE WORKER] Completed. Updated: ${updatedCount} certificates, Sent alerts: ${alertsSentCount} emails.`);
  } catch (error: any) {
    console.error(`[COMPLIANCE WORKER ERROR] Failed during compliance checks: ${error.message}`);
  }
};
