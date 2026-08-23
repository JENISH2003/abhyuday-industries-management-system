import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';

interface TokenPayload {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager' | 'user';
  name?: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(
    { id: payload.id, email: payload.email, role: payload.role, name: payload.name },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN as any }
  );
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(
    { id: payload.id, email: payload.email, role: payload.role, name: payload.name, jti: crypto.randomUUID() },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN as any }
  );
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as TokenPayload;
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
