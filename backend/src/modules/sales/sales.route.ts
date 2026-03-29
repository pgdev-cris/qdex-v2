import { Router } from 'express';
import controller from './sales.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';

const router = Router();

router.get('/vendor/:code', jwtValidator, controller.fetchSalesRequest);

export default router;
