import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Retrieve all categories (accessible by all authenticated users)
router.get('/', authenticate, getCategories);

// Modify categories (restricted to Super Admin)
router.post('/', authenticate, authorizeRoles('super_admin'), createCategory);
router.put('/:id', authenticate, authorizeRoles('super_admin'), updateCategory);
router.delete('/:id', authenticate, authorizeRoles('super_admin'), deleteCategory);

export default router;
