import nodemailer from 'nodemailer';
import { config } from '../config/env';
import EmailLog from '../models/EmailLog';
import EmailSetting from '../models/EmailSetting';

export const getTransporterAndFrom = async (): Promise<{ transporter: nodemailer.Transporter; from: string; user?: string; pass?: string }> => {
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
      family: 4,
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 20000,
      tls: {
        rejectUnauthorized: false
      },
      auth: {
        user: dbSetting.smtpUser,
        pass: dbSetting.smtpPass,
      },
    } as any);

    const fromName = dbSetting.fromName || 'Abhyuday Management System';
    const fromEmail = dbSetting.fromEmail || dbSetting.smtpUser;
    const from = `"${fromName}" <${fromEmail}>`;

    return { transporter, from, user: dbSetting.smtpUser, pass: dbSetting.smtpPass };
  }

  // Fallback to environment variables or Ethereal / mock
  if (config.SMTP_USER === 'mock_user' || !config.SMTP_USER) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        family: 4,
        connectionTimeout: 12000,
        greetingTimeout: 12000,
        socketTimeout: 20000,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      } as any);
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
      family: 4,
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 20000,
      tls: {
        rejectUnauthorized: false
      },
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    } as any);
    return { transporter, from: config.SMTP_FROM, user: config.SMTP_USER, pass: config.SMTP_PASS };
  }
};

export const sendMail = async (
  recipient: string,
  subject: string,
  type: 'certificate_reminder' | 'meeting_reminder' | 'expiry_alert' | 'login_notification' | 'bulk_summary' | 'password_reset',
  htmlContent: string
): Promise<boolean> => {
  let primaryError = '';
  const { transporter, from, user, pass } = await getTransporterAndFrom();

  const mailOptions = {
    from,
    to: recipient,
    subject: subject,
    html: htmlContent,
  };

  // Attempt 1: Primary Transporter (IPv4 forced, port 587)
  try {
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    
    await EmailLog.create({
      subject,
      recipient,
      type,
      status: 'sent',
      sentOn: new Date(),
      errorMessage: previewUrl ? `Preview URL: ${previewUrl}` : undefined,
    });

    console.log(`[Mail Sent Primary] Recipient: ${recipient} | Subject: "${subject}" | MessageId: ${info.messageId || 'simulated'}`);
    return true;
  } catch (error: any) {
    primaryError = error.message;
    console.warn(`[Mail Primary Failed] Recipient: ${recipient} | Error: ${primaryError}. Trying fallback transporter...`);
  }

  // Attempt 2: Fallback Transporter using Nodemailer's built-in 'gmail' service with IPv4
  if (user && pass) {
    try {
      const fallbackTransporter = nodemailer.createTransport({
        service: 'gmail',
        family: 4,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
        auth: { user, pass },
      } as any);

      const info = await fallbackTransporter.sendMail(mailOptions);
      
      await EmailLog.create({
        subject,
        recipient,
        type,
        status: 'sent',
        sentOn: new Date(),
        errorMessage: `Fallback Gmail service delivered. Primary error: ${primaryError}`,
      });

      console.log(`[Mail Sent Fallback] Recipient: ${recipient} | Subject: "${subject}" | MessageId: ${info.messageId || 'simulated'}`);
      return true;
    } catch (fallbackErr: any) {
      console.error(`[Mail Fallback Failed] Recipient: ${recipient} | Error: ${fallbackErr.message}`);
      primaryError = `${primaryError} | Fallback Error: ${fallbackErr.message}`;
    }
  }

  // Record final failure if both attempts failed
  await EmailLog.create({
    subject,
    recipient,
    type,
    status: 'failed',
    sentOn: new Date(),
    errorMessage: primaryError,
  });

  return false;
};
