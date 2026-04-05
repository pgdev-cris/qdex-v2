import { Router } from 'express';
import controller from './auth.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';

const router = Router();

router.post('/login', controller.loginRequest);

// POST /api/v1/auth/override — verify an approver's credentials for override
router.post('/override', jwtValidator, controller.overrideRequest);

export default router;
