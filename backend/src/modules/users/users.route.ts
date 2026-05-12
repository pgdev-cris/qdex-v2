import { Router } from 'express';
import controller from './users.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';
import { requestValidator } from '../../shared/middlewares/requestValidator.middleware';
import {
    CreateUserRequestSchema,
    UpdateUserRequestSchema,
    UpdateUserStatusSchema,
    UserIdParamSchema,
    ChangePasswordSchema,
} from './users.schema';

const router = Router();

// GET /api/v1/users
router.get('/', jwtValidator, controller.getUsersRequest);

// GET /api/v1/users/:id
router.get(
    '/:id',
    jwtValidator,
    requestValidator({ params: UserIdParamSchema }),
    controller.getUserRequest,
);

// POST /api/v1/users
router.post(
    '/',
    jwtValidator,
    requestValidator({ body: CreateUserRequestSchema }),
    controller.saveUserRequest,
);

// PUT /api/v1/users/:id
router.put(
    '/:id',
    jwtValidator,
    requestValidator({ params: UserIdParamSchema, body: UpdateUserRequestSchema }),
    controller.updateUserRequest,
);

// PATCH /api/v1/users/:id/status  — soft delete or activate/deactivate
router.patch(
    '/:id/status',
    jwtValidator,
    requestValidator({ params: UserIdParamSchema, body: UpdateUserStatusSchema }),
    controller.setUserStatusRequest,
);

// PATCH /api/v1/users/:id/password  — change user password
router.patch(
    '/:id/password',
    jwtValidator,
    requestValidator({ params: UserIdParamSchema, body: ChangePasswordSchema }),
    controller.changePasswordRequest,
);

export default router;
