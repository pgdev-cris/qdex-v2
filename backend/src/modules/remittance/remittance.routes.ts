import { Router } from 'express';
import controller from './remittance.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';

const router = Router();

// POST /remittance/partial — partial remittance (cash only)
router.post('/partial', jwtValidator, controller.partialRemitRequest);

// POST /remittance — full remittance (all payment methods)
router.post('/', jwtValidator, controller.fullRemitRequest);

export default router;
