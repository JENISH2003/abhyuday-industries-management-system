import { Router } from 'express';
import { getActivityLogs, getEmailLogs, sendTestEmail, deleteActivityLog, deleteEmailLog, clearAllActivityLogs, clearAllEmailLogs } from '../controllers/logController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Only admin and super_admin can view compliance audit logs
router.get('/activity', authenticate, authorizeRoles('super_admin', 'admin'), getActivityLogs);
router.get('/email', authenticate, authorizeRoles('super_admin', 'admin'), getEmailLogs);
router.post('/email/test', authenticate, authorizeRoles('super_admin', 'admin'), sendTestEmail);

// Delete logs permanently (Super Admin & Admin)
router.delete('/activity/all', authenticate, authorizeRoles('super_admin', 'admin'), clearAllActivityLogs);
router.delete('/email/all', authenticate, authorizeRoles('super_admin', 'admin'), clearAllEmailLogs);
router.delete('/activity/:id', authenticate, authorizeRoles('super_admin', 'admin'), deleteActivityLog);
router.delete('/email/:id', authenticate, authorizeRoles('super_admin', 'admin'), deleteEmailLog);

export default router;

