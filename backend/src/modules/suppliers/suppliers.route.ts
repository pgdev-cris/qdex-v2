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

// GET /suppliers - Get all suppliers
router.get('/', jwtValidator, controller.getSuppliersRequest);

// GET /suppliers/:id - Get supplier by ID
router.get(
    '/:id',
    jwtValidator,
    requestValidator({ params: SupplierIdParamSchema }),
    controller.getSupplierRequest,
);

// POST /suppliers - Create a new supplier
router.post(
    '/',
    jwtValidator,
    requestValidator({ body: CreateSupplierSchema }),
    controller.createSupplierRequest,
);

// PUT /suppliers/:id - Update an existing supplier
router.put(
    '/:id',
    jwtValidator,
    requestValidator({ params: SupplierIdParamSchema, body: UpdateSupplierSchema }),
    controller.updateSupplierRequest,
);

// PATCH /suppliers/:id/status  — soft delete or toggle active/inactive
router.patch(
    '/:id/status',
    jwtValidator,
    requestValidator({ params: SupplierIdParamSchema, body: UpdateSupplierStatusSchema }),
    controller.setSupplierStatusRequest,
);

export default router;
