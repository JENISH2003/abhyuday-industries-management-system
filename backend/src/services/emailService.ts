import nodemailer from 'nodemailer';
import { config } from '../config/env';
import EmailLog from '../models/EmailLog';
import EmailSetting from '../models/EmailSetting';

export const getTransporterAndFrom = async (): Promise<{ transporter: nodemailer.Transporter; from: string }> => {
  // Check if active custom SMTP configuration exists in database or env
  const dbSetting = await EmailSetting.findOne().sort({ updatedAt: -1 });

  const host = dbSetting?.smtpHost || config.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(dbSetting?.smtpPort || config.SMTP_PORT || 465);
  const user = dbSetting?.smtpUser || config.SMTP_USER;
  const pass = dbSetting?.smtpPass || config.SMTP_PASS;

  if (user && pass && user !== 'mock_user') {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });

    const fromName = dbSetting?.fromName || 'Abhyuday Management System';
    const fromEmail = dbSetting?.fromEmail || user;
    const from = `"${fromName}" <${fromEmail}>`;

    return { transporter, from };
  }

  // Fast instant fallback without external network API calls
  const transporter = nodemailer.createTransport({ jsonTransport: true });
  return { transporter, from: config.SMTP_FROM || '"Abhyuday Management" <noreply@abhyuday.com>' };
};

export const sendMail = async (
  recipient: string,
  subject: string,
  type: 'certificate_reminder' | 'meeting_reminder' | 'expiry_alert' | 'login_notification' | 'bulk_summary' | 'password_reset',
  htmlContent: string
): Promise<boolean> => {
  try {
    const { transporter, from } = await getTransporterAndFrom();
    
    const mailOptions = {
      from,
      to: recipient,
      subject: subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    
    // Log success in DB
    await EmailLog.create({
      subject,
      recipient,
      type,
      status: 'sent',
      sentOn: new Date(),
      errorMessage: previewUrl ? `Preview URL: ${previewUrl}` : undefined,
    });

    console.log(`[Mail Sent] Recipient: ${recipient} | Subject: "${subject}" | MessageId: ${info.messageId || 'simulated'}`);
    return true;
  } catch (error: any) {
    console.error(`Email sending failed to ${recipient}: ${error.message}`);
    
    // Log failure in DB
    await EmailLog.create({
      subject,
      recipient,
      type,
      status: 'failed',
      sentOn: new Date(),
      errorMessage: error.message,
    });

    return false;
  }
};
