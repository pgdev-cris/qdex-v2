import { Router } from 'express';
import controller from './sales.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';

const router = Router();

// GET /api/v1/sales/fetch/:code
// Proxies to the internal sales service; requires auth.
router.get('/vendor/:code', jwtValidator, controller.fetchSalesRequest);

export default router;
