import { Router } from 'express';
import {
  getStabilityRecords,
  createStabilityRecord,
  completeStabilityInterval,
  revertStabilityInterval,
  deleteStabilityRecord,
} from '../controllers/stabilityController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Retrieve all stability records and history (all authenticated users)
router.get('/', authenticate, getStabilityRecords);

// Create new stability record (super_admin, admin, manager)
router.post(
  '/',
  authenticate,
  authorizeRoles('super_admin', 'admin', 'manager'),
  createStabilityRecord
);

// Mark current interval completed & auto-advance (super_admin, admin, manager, user)
router.post(
  '/:id/complete',
  authenticate,
  authorizeRoles('super_admin', 'admin', 'manager', 'user'),
  completeStabilityInterval
);

// Undo / Revert accidentally completed interval back to active pending status
router.post(
  '/:id/revert',
  authenticate,
  authorizeRoles('super_admin', 'admin', 'manager', 'user'),
  revertStabilityInterval
);

// Delete stability record (super_admin, admin)
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('super_admin', 'admin'),
  deleteStabilityRecord
);

export default router;
