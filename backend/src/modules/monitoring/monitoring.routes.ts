import { Router } from 'express';
import controller from './monitoring.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';

const router = Router();

// GET /api/v1/monitoring          — paginated transaction list
router.get('/', jwtValidator, controller.listTransactionsRequest);

// GET /api/v1/monitoring/:id      — single transaction with details
router.get('/:id', jwtValidator, controller.getTransactionRequest);

export default router;
