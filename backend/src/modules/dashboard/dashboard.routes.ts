import { Router } from 'express';
import controller from './dashboard.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';

const router = Router();

router.get('/stats', jwtValidator, controller.getDashboardStats);

export default router;
