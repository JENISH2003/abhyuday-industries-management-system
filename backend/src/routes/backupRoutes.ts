import { Router } from 'express';
import { backupDatabase, restoreDatabase } from '../controllers/backupController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';
import { upload, jsonUpload } from '../middlewares/uploadMiddleware';

const router = Router();

// Only Super Admins can perform database Backup and Restore
router.get('/backup', authenticate, authorizeRoles('super_admin'), backupDatabase);
router.post('/restore', authenticate, authorizeRoles('super_admin'), jsonUpload.single('file'), restoreDatabase);

export default router;
