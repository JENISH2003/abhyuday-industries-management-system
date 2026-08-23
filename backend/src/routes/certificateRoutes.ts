import { Router } from 'express';
import {
  createCertificate,
  bulkCreateCertificates,
  getCertificates,
  getCertificateStats,
  getCertificateById,
  updateCertificate,
  renewCertificate,
  deleteCertificate,
  toggleResolveCertificate,
} from '../controllers/certificateController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Stats summary endpoint (MUST be registered before /:id)
router.get('/stats', authenticate, getCertificateStats);

// Retrieve all (accessible by all authenticated users)
router.get('/', authenticate, getCertificates);

// Retrieve details
router.get('/:id', authenticate, getCertificateById);

// Toggle Done / Resolved status to suppress/enable email notifications
router.patch(
  '/:id/resolve',
  authenticate,
  authorizeRoles('super_admin', 'admin', 'manager', 'user'),
  toggleResolveCertificate
);

// Renew certificate expiry date directly
router.put(
  '/:id/renew',
  authenticate,
  authorizeRoles('super_admin', 'admin', 'manager', 'user'),
  renewCertificate
);

// Create single certificate (super_admin, admin, manager)
router.post(
  '/',
  authenticate,
  authorizeRoles('super_admin', 'admin', 'manager'),
  createCertificate
);

// Enterprise Bulk Create certificates (super_admin, admin, manager)
router.post(
  '/bulk',
  authenticate,
  authorizeRoles('super_admin', 'admin', 'manager'),
  bulkCreateCertificates
);

// Update certificate (super_admin, admin, manager)
router.put(
  '/:id',
  authenticate,
  authorizeRoles('super_admin', 'admin', 'manager'),
  updateCertificate
);

// Delete certificate (super_admin, admin only)
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('super_admin', 'admin'),
  deleteCertificate
);

export default router;
