import { Router } from 'express';
import { createMeeting, getMeetings, deleteMeeting } from '../controllers/meetingController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticate, getMeetings);

router.post('/', authenticate, authorizeRoles('super_admin', 'admin', 'manager'), createMeeting);

router.delete('/:id', authenticate, authorizeRoles('super_admin', 'admin'), deleteMeeting);

export default router;
