import { Router } from 'express';
import {
  getEmailSettings,
  saveEmailSettings,
  verifySmtpConnection,
  sendTestSmtpEmail,
} from '../controllers/emailSettingController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Retrieve SMTP Email settings
router.get('/', authenticate, authorizeRoles('super_admin', 'admin'), getEmailSettings);

// Save / Update SMTP Email settings
router.put('/', authenticate, authorizeRoles('super_admin', 'admin'), saveEmailSettings);

// Verify live SMTP connection
router.post('/verify', authenticate, authorizeRoles('super_admin', 'admin'), verifySmtpConnection);

// Send live test SMTP email
router.post('/test', authenticate, authorizeRoles('super_admin', 'admin'), sendTestSmtpEmail);

export default router;
