import { Router } from 'express';
import controller from './sales.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';

const router = Router();

// GET /sales/supplier/:code — Get sales of supplier in POS.
router.get('/supplier/:code', jwtValidator, controller.fetchSalesRequest);

export default router;
