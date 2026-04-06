import { Router } from 'express';
import controller from './reports.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';
import { requestValidator } from '../../shared/middlewares/requestValidator.middleware';
import {
    RemittanceReportQuerySchema,
    TransactionReportQuerySchema,
    RemittanceStatusQuerySchema,
} from './reports.schema';

const router = Router();

// GET /api/v1/reports/remittances/summary  — must be before /:id to avoid route conflict
router.get(
    '/remittances/summary',
    jwtValidator,
    requestValidator({ query: RemittanceReportQuerySchema }),
    controller.getRemittanceSummaryRequest,
);

// GET /api/v1/reports/remittances
router.get(
    '/remittances',
    jwtValidator,
    requestValidator({ query: RemittanceReportQuerySchema }),
    controller.getRemittanceReportRequest,
);

// GET /api/v1/reports/remittances/:id
router.get('/remittances/:id', jwtValidator, controller.getRemittanceDetailRequest);

// GET /api/v1/reports/transactions
router.get(
    '/transactions',
    jwtValidator,
    requestValidator({ query: TransactionReportQuerySchema }),
    controller.getTransactionReportRequest,
);

// GET /api/v1/reports/supplier-per-tender
router.get(
    '/supplier-per-tender',
    jwtValidator,
    requestValidator({ query: TransactionReportQuerySchema }),
    controller.getSupplierPerTenderRequest,
);

// GET /api/v1/reports/remittance-status
router.get(
    '/remittance-status',
    jwtValidator,
    requestValidator({ query: RemittanceStatusQuerySchema }),
    controller.getRemittanceStatusRequest,
);

export default router;
