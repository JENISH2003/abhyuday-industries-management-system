import nodemailer from 'nodemailer';
import { config } from '../config/env';
import EmailLog from '../models/EmailLog';
import EmailSetting from '../models/EmailSetting';

export const getTransporterAndFrom = async (): Promise<{ transporter: nodemailer.Transporter; from: string }> => {
  // Check if active custom SMTP configuration exists in database
  const dbSetting = await EmailSetting.findOne().sort({ updatedAt: -1 });

  if (dbSetting && dbSetting.smtpUser && dbSetting.smtpPass) {
    let port = Number(dbSetting.smtpPort) || 587;
    let isSecure = port === 465;
    if (dbSetting.smtpHost?.includes('gmail') || !dbSetting.smtpHost) {
      port = 587;
      isSecure = false;
    }
    const transporter = nodemailer.createTransport({
      host: dbSetting.smtpHost || 'smtp.gmail.com',
      port,
      secure: isSecure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      },
      auth: {
        user: dbSetting.smtpUser,
        pass: dbSetting.smtpPass,
      },
    });

    const fromName = dbSetting.fromName || 'Abhyuday Management System';
    const fromEmail = dbSetting.fromEmail || dbSetting.smtpUser;
    const from = `"${fromName}" <${fromEmail}>`;

    return { transporter, from };
  }

  // Fallback to environment variables or Ethereal / mock
  if (config.SMTP_USER === 'mock_user' || !config.SMTP_USER) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      return { transporter, from: `"Abhyuday Demo" <${testAccount.user}>` };
    } catch (err: any) {
      const transporter = nodemailer.createTransport({ jsonTransport: true });
      return { transporter, from: config.SMTP_FROM };
    }
  } else {
    let port = Number(config.SMTP_PORT) || 587;
    let isSecure = port === 465;
    const host = config.SMTP_HOST || 'smtp.gmail.com';
    if (host.includes('gmail')) {
      port = 587;
      isSecure = false;
    }
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      },
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });
    return { transporter, from: config.SMTP_FROM };
  }
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
