import { Router } from 'express';
import controller from './remittance.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';

const router = Router();

// GET /remittance/partial-summary/:supplier_code — today's partial cash total for a supplier
router.get('/partial-summary/:supplier_code', jwtValidator, controller.getPartialSummaryRequest);

// POST /remittance/partial — partial remittance (cash only)
router.post('/partial', jwtValidator, controller.partialRemitRequest);

// POST /remittance — full remittance (all payment methods)
router.post('/', jwtValidator, controller.fullRemitRequest);

// POST /remittance/void/:id — void a transaction (requires override)
router.post('/void/:id', jwtValidator, controller.voidRemitRequest);

export default router;
