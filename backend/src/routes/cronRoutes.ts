import { Router } from 'express';
import { dispatchDailyEmails } from '../controllers/cronController';

const router = Router();

// GET or POST /api/cron/dispatch
router.get('/dispatch', dispatchDailyEmails);
router.post('/dispatch', dispatchDailyEmails);

export default router;
