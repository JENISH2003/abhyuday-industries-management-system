import { Router } from 'express';
import {
  getUsers,
  changeUserStatus,
  changeUserRole,
  deleteUser,
} from '../controllers/userController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Only admin and super admin can view the users directory
router.get('/', authenticate, authorizeRoles('super_admin', 'admin'), getUsers);

// Block/Unblock users (accessible by admin and super admin)
router.put('/:id/status', authenticate, authorizeRoles('super_admin', 'admin'), changeUserStatus);

// Change user roles (restricted to Super Admin only)
router.put('/:id/role', authenticate, authorizeRoles('super_admin'), changeUserRole);

// Delete users (restricted to Super Admin only)
router.delete('/:id', authenticate, authorizeRoles('super_admin'), deleteUser);

export default router;
