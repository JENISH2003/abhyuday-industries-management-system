import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import ActivityLog from '../models/ActivityLog';
import { sendMail } from '../services/emailService';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../services/authService';
import {
  RegisterValidator,
  LoginValidator,
  UpdatePasswordValidator,
} from '../validators';
import { AuthenticatedRequest } from '../types';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedBody = RegisterValidator.parse(req.body);

    const targetEmail = validatedBody.email.trim().toLowerCase();
    const escapedEmail = targetEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const userExists = await User.findOne({ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'jenishkpatel2003@gmail.com').toLowerCase();
    const isSuperAdminEmail = targetEmail === superAdminEmail;

    const newUser = new User({
      name: validatedBody.name.trim(),
      email: targetEmail,
      password: validatedBody.password,
      role: isSuperAdminEmail ? 'super_admin' : 'admin',
      status: 'active',
      isVerified: true,
    });

    await newUser.save();

    // Hide password before returning
    const userResponse = newUser.toObject();
    delete (userResponse as any).password;

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedBody = LoginValidator.parse(req.body);

    const targetEmail = validatedBody.email.trim().toLowerCase();
    const escapedEmail = targetEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact administrator.' });
    }

    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'jenishkpatel2003@gmail.com').toLowerCase();
    const isSuperAdminUser = user.email.toLowerCase() === superAdminEmail;

    const isMatch = await user.comparePassword(validatedBody.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password. Please verify your credentials.' });
    }

    // Auto-promote Super Admin email to super_admin role if not set
    if (isSuperAdminUser && user.role !== 'super_admin') {
      user.role = 'super_admin';
      await user.save();
    }

    // Set last login time
    const loginTimestamp = new Date();
    user.lastLogin = loginTimestamp;
    await user.save();

    // Extract client IP and User Agent for multi-device session tracking
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || '';

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const tokenHash = hashToken(refreshToken);

    // Save NEW Refresh Token HASH to database (30-day rolling persistent session)
    const cookieMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const refreshExpiresAt = new Date(Date.now() + cookieMaxAge);

    await RefreshToken.create({
      tokenHash,
      user: user._id,
      expiresAt: refreshExpiresAt,
      createdByIp: clientIp,
      userAgent,
      lastUsedAt: new Date(),
    });

    // Set refresh token in HTTP-only cookie (Independent device session)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
    });

    res.status(200).json({
      success: true,
      message: 'Successfully logged in',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Session expired or not found. Please log in.' });
    }

    const tokenHash = hashToken(refreshToken);

    // Verify token exists in Database by HASH
    const existingTokenDoc = await RefreshToken.findOne({ tokenHash });
    if (!existingTokenDoc) {
      // Graceful fallback for concurrent tab requests: check if JWT itself is cryptographically valid
      try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.id);

        if (user && user.status !== 'blocked') {
          const newAccessToken = generateAccessToken({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            name: user.name,
          });

          return res.status(200).json({
            success: true,
            accessToken: newAccessToken,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              status: user.status,
              lastLogin: user.lastLogin,
            },
          });
        }
      } catch (fallbackErr) {
        // Fallback failed, proceed to clear cookie and return 401
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      return res.status(401).json({ message: 'Session expired or invalid. Please log in.' });
    }

    // ROTATION: Delete the used refresh token HASH from database
    await RefreshToken.deleteOne({ tokenHash });

    // Verify JWT payload & user status
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || user.status === 'blocked') {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      return res.status(401).json({ message: 'User not found or suspended' });
    }

    // Generate BRAND NEW Access Token (15m) & Refresh Token (30d)
    const newAccessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const newRefreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const newTokenHash = hashToken(newRefreshToken);

    // Save NEW Refresh Token HASH to database (30 days rolling)
    const cookieMaxAge = 30 * 24 * 60 * 60 * 1000;
    const newRefreshExpiresAt = new Date(Date.now() + cookieMaxAge);

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || '';

    await RefreshToken.create({
      tokenHash: newTokenHash,
      user: user._id,
      expiresAt: newRefreshExpiresAt,
      createdByIp: clientIp,
      userAgent,
      lastUsedAt: new Date(),
    });

    // Set NEW Refresh Token HTTP-only cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
    });

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error: any) {
    console.error('Refresh Token Rotation Error:', error.message);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.status(401).json({ message: 'Session expired, please login again' });
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      // Delete ONLY the current device session from DB
      await RefreshToken.deleteOne({ tokenHash });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const logoutAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    // Revoke ALL active refresh token sessions belonging to this user
    await RefreshToken.deleteMany({ user: req.user.id });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.status(200).json({ success: true, message: 'Logged out from all devices successfully' });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name.trim();
    await user.save();

    // Log Activity
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await ActivityLog.create({
      userId: user._id,
      userName: user.name,
      module: 'User',
      action: 'Update Name',
      details: `User updated profile name to "${user.name}".`,
      ipAddress: clientIp,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Profile name updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    const validatedBody = UpdatePasswordValidator.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(validatedBody.oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    user.password = validatedBody.newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// 1. Request OTP Code for Password Reset
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Please provide your registered email address.' });
    }

    const targetEmail = email.trim().toLowerCase();
    const escapedEmail = targetEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } });
    if (!user) {
      console.warn(`[FORGOT PASSWORD] Reset requested for email not registered in database: ${email}`);
      // Standard OWASP security pattern (prevents account enumeration & false validation errors)
      return res.status(200).json({
        success: true,
        message: `If an account with ${email} exists, a 6-digit OTP code has been sent. Please check your inbox.`,
        cooldownSeconds: 45,
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account is currently suspended. Please contact administrator.' });
    }

    // Check Resend Cooldown (Allow resend only after 45 seconds)
    const now = new Date();
    if (user.lastOtpSentAt) {
      const timeDiffSeconds = Math.floor((now.getTime() - new Date(user.lastOtpSentAt).getTime()) / 1000);
      if (timeDiffSeconds < 45) {
        return res.status(429).json({
          message: `Please wait ${45 - timeDiffSeconds} seconds before requesting a new OTP code.`,
          cooldownSeconds: 45 - timeDiffSeconds,
        });
      }
    }

    // Generate 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiration to 10 minutes (600 seconds)
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetOtp: otpCode,
          resetOtpExpires: otpExpires,
          resetOtpAttempts: 0,
          lastOtpSentAt: now,
        },
      }
    );

    // Send Rich HTML Email with OTP
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 22px;">Abhyuday Management System</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Password Reset Security Request</p>
        </div>

        <p style="font-size: 14px; color: #334155; margin-bottom: 16px;">Hello <strong>${user.name}</strong>,</p>
        <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">You requested a password reset for your account. Your single-use 6-digit verification code is:</p>

        <div style="text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563eb; background-color: #eff6ff; padding: 12px 28px; border-radius: 12px; border: 1px border #bfdbfe; display: inline-block;">
            ${otpCode}
          </span>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 20px;">This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">If you did not request this reset, you can safely ignore this email.</p>
      </div>
    `;

    const mailSent = await sendMail(user.email, '🔐 Your 6-Digit Password Reset OTP Code', 'password_reset', htmlContent);

    if (!mailSent) {
      return res.status(500).json({
        message: 'Failed to deliver OTP verification email. Please check server SMTP configuration.',
      });
    }

    res.status(200).json({
      success: true,
      message: `A 6-digit OTP code has been sent to ${user.email}. It expires in 10 minutes.`,
      cooldownSeconds: 45,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Verify OTP Code
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and 6-digit OTP are required.' });
    }

    const targetEmail = email.trim().toLowerCase();
    const escapedEmail = targetEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } });
    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ message: 'No active OTP request found. Please request a new OTP.' });
    }

    // Check OTP Expiry (10 minutes)
    if (new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({ message: 'OTP has expired (10 minutes exceeded). Please request a new code.' });
    }

    // Check Max Verification Attempts (5 attempts limit)
    const currentAttempts = (user.resetOtpAttempts || 0);
    if (currentAttempts >= 5) {
      return res.status(400).json({
        message: 'Maximum OTP verification attempts (5/5) exceeded for security. Please request a new OTP code.'
      });
    }

    // Verify Code
    if (user.resetOtp !== otp.trim()) {
      const newAttempts = currentAttempts + 1;
      await User.updateOne({ _id: user._id }, { $set: { resetOtpAttempts: newAttempts } });
      const remaining = 5 - newAttempts;
      return res.status(400).json({
        message: `Invalid OTP code. ${remaining > 0 ? `You have ${remaining} attempts remaining.` : 'Maximum attempts reached.'}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. Please enter your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// 3. Reset Password Using Verified OTP
export const resetPasswordWithOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const targetEmail = email.trim().toLowerCase();
    const escapedEmail = targetEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } });
    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ message: 'No active OTP session found. Please request a new OTP.' });
    }

    // Verify expiry again
    if (new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP code.' });
    }

    // Check attempts limit
    if ((user.resetOtpAttempts || 0) >= 5) {
      return res.status(400).json({ message: 'Maximum OTP attempts exceeded. Please request a new code.' });
    }

    // Verify OTP match
    if (user.resetOtp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid OTP verification code.' });
    }

    // Set new password (pre-save hook will hash it with bcrypt algorithm)
    user.password = newPassword;

    // IMMEDIATELY INVALIDATE OTP FIELDS
    user.resetOtp = null;
    user.resetOtpExpires = null;
    user.resetOtpAttempts = 0;
    user.lastOtpSentAt = null;

    await user.save();

    // Revoke all previous active login sessions on all devices for security
    await RefreshToken.deleteMany({ user: user._id });

    // Log security audit event in ActivityLog
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await ActivityLog.create({
      userId: user._id,
      userName: user.name,
      module: 'Auth',
      action: 'Password Reset',
      details: `User successfully reset account password via OTP verification.`,
      ipAddress: clientIp,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};
