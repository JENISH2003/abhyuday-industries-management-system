import { Response, NextFunction } from 'express';
import EmailSetting from '../models/EmailSetting';
import { AuthenticatedRequest } from '../types';
import nodemailer from 'nodemailer';
import { config } from '../config/env';

export const getEmailSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let settings = await EmailSetting.findOne().sort({ updatedAt: -1 });
    if (!settings) {
      // Default fallback from env config
      return res.status(200).json({
        success: true,
        settings: {
          smtpHost: config.SMTP_HOST || 'smtp.gmail.com',
          smtpPort: config.SMTP_PORT || 465,
          secure: config.SMTP_PORT === 465,
          smtpUser: config.SMTP_USER || '',
          smtpPass: config.SMTP_PASS ? '********' : '',
          fromName: 'Abhyuday Management System Compliance System',
          fromEmail: config.SMTP_USER || '',
          replyTo: config.SMTP_USER || '',
        }
      });
    }

    // Mask password in GET response
    const maskedSettings = settings.toObject();
    if (maskedSettings.smtpPass) {
      maskedSettings.smtpPass = '********';
    }

    res.status(200).json({
      success: true,
      settings: maskedSettings
    });
  } catch (error) {
    next(error);
  }
};

export const saveEmailSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { smtpHost, smtpPort, secure, smtpUser, smtpPass, fromName, fromEmail, replyTo } = req.body;

    if (!smtpHost || !smtpPort || !smtpUser) {
      return res.status(400).json({ message: 'SMTP Host, Port, and User email are required.' });
    }

    let settings = await EmailSetting.findOne().sort({ updatedAt: -1 });
    if (!settings) {
      settings = new EmailSetting();
    }

    settings.smtpHost = smtpHost.trim();
    settings.smtpPort = Number(smtpPort);
    settings.secure = Boolean(secure);
    settings.smtpUser = smtpUser.trim();
    if (smtpPass && smtpPass !== '********') {
      settings.smtpPass = smtpPass.trim();
    }
    settings.fromName = fromName ? fromName.trim() : 'Abhyuday Management System';
    settings.fromEmail = fromEmail ? fromEmail.trim() : smtpUser.trim();
    settings.replyTo = replyTo ? replyTo.trim() : '';
    settings.updatedBy = req.user?.id as any;

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'SMTP Email Configuration saved successfully.',
      settings: {
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        secure: settings.secure,
        smtpUser: settings.smtpUser,
        smtpPass: '********',
        fromName: settings.fromName,
        fromEmail: settings.fromEmail,
        replyTo: settings.replyTo,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifySmtpConnection = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { smtpHost, smtpPort, secure, smtpUser, smtpPass } = req.body;

    let targetPass = smtpPass;
    if (!targetPass || targetPass === '********') {
      const existing = await EmailSetting.findOne().sort({ updatedAt: -1 });
      targetPass = existing?.smtpPass || config.SMTP_PASS;
    }

    const host = smtpHost || config.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(smtpPort || config.SMTP_PORT || 465);

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure !== undefined ? Boolean(secure) : port === 465,
      auth: {
        user: smtpUser || config.SMTP_USER,
        pass: targetPass,
      },
    });

    await transporter.verify();

    res.status(200).json({
      success: true,
      message: 'SMTP server connection verified successfully! Connection established.',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: `SMTP Connection Failed: ${error.message || 'Check host, port, user or App Password.'}`,
    });
  }
};

export const sendTestSmtpEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { recipient, subject, body } = req.body;
    if (!recipient) {
      return res.status(400).json({ message: 'Recipient email address is required.' });
    }

    const dbSetting = await EmailSetting.findOne().sort({ updatedAt: -1 });
    const host = dbSetting?.smtpHost || config.SMTP_HOST || 'smtp.gmail.com';
    const port = dbSetting?.smtpPort || config.SMTP_PORT || 465;
    const user = dbSetting?.smtpUser || config.SMTP_USER;
    const pass = dbSetting?.smtpPass || config.SMTP_PASS;
    const fromName = dbSetting?.fromName || 'Abhyuday Management System Compliance System';
    const fromEmail = dbSetting?.fromEmail || user;

    if (!user || !pass) {
      return res.status(400).json({ message: 'SMTP User and Password/App Password must be configured.' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: recipient,
      subject: subject || '[Abhyuday] Enterprise System Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 12px; color: #1e293b;">
          <h2 style="color: #2563eb; margin-top: 0;">🛡️ Abhyuday Enterprise Email Verification</h2>
          <p>This is an automated test notification confirming that your SMTP email server integration is working properly.</p>
          <div style="background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 15px 0;">
            <p style="margin: 0; font-size: 13px;"><strong>SMTP Server:</strong> ${host}:${port}</p>
            <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Sender Account:</strong> ${fromEmail}</p>
            <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Test Message:</strong> ${body || 'Connection verification clean.'}</p>
          </div>
          <p style="font-size: 12px; color: #64748b;">Dispatched by ${req.user?.name || 'Administrator'} on ${new Date().toLocaleString()}</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: `Test email successfully delivered to ${recipient}!`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Failed to deliver test email: ${error.message}`,
    });
  }
};
