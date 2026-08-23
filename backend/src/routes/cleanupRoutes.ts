import { Router } from 'express';
import { 
  getDataStorageStats,
  getPurgeItems,
  purgeNotifications,
  purgeActivityLogs,
  purgeEmailLogs,
  purgeCertificates
} from '../controllers/cleanupController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Protect all routes with authentication and Super Admin clearance
router.use(authenticate);
router.use(authorizeRoles('super_admin'));

router.get('/stats', getDataStorageStats);
router.get('/items', getPurgeItems);
router.post('/notifications', purgeNotifications);
router.post('/activity-logs', purgeActivityLogs);
router.post('/email-logs', purgeEmailLogs);
router.post('/certificates', purgeCertificates);

export default router;
