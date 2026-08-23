import { Router } from 'express';
import {
  getPersonalReminders,
  createPersonalReminder,
  updatePersonalReminder,
  toggleReminderStatus,
  deletePersonalReminder,
  triggerReminderNow,
} from '../controllers/personalReminderController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getPersonalReminders);
router.post('/', createPersonalReminder);
router.put('/:id', updatePersonalReminder);
router.patch('/:id/status', toggleReminderStatus);
router.delete('/:id', deletePersonalReminder);
router.post('/:id/trigger', triggerReminderNow);

export default router;
