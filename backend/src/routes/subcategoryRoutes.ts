import { Router } from 'express';
import {
  getSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from '../controllers/subcategoryController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Retrieve subcategories (accessible by all authenticated users)
router.get('/', authenticate, getSubcategories);

// Modify subcategories (restricted to Super Admin)
router.post('/', authenticate, authorizeRoles('super_admin'), createSubcategory);
router.put('/:id', authenticate, authorizeRoles('super_admin'), updateSubcategory);
router.delete('/:id', authenticate, authorizeRoles('super_admin'), deleteSubcategory);

export default router;
