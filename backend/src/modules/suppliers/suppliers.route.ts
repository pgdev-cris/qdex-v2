import { Router } from 'express';
import controller from './suppliers.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';
import { requestValidator } from '../../shared/middlewares/requestValidator.middleware';
import {
    CreateSupplierSchema,
    UpdateSupplierSchema,
    UpdateSupplierStatusSchema,
    SupplierIdParamSchema,
} from './suppliers.schema';

const router = Router();

// GET /api/v1/suppliers
router.get('/', jwtValidator, controller.getSuppliersRequest);

// GET /api/v1/suppliers/:id
router.get(
    '/:id',
    jwtValidator,
    requestValidator({ params: SupplierIdParamSchema }),
    controller.getSupplierRequest,
);

// POST /api/v1/suppliers
router.post(
    '/',
    jwtValidator,
    requestValidator({ body: CreateSupplierSchema }),
    controller.createSupplierRequest,
);

// PUT /api/v1/suppliers/:id
router.put(
    '/:id',
    jwtValidator,
    requestValidator({ params: SupplierIdParamSchema, body: UpdateSupplierSchema }),
    controller.updateSupplierRequest,
);

// PATCH /api/v1/suppliers/:id/status  — soft delete or toggle active/inactive
router.patch(
    '/:id/status',
    jwtValidator,
    requestValidator({ params: SupplierIdParamSchema, body: UpdateSupplierStatusSchema }),
    controller.setSupplierStatusRequest,
);

export default router;
