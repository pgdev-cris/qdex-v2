import { Router } from 'express';
import controller from './menu.controllers';
import { requestValidator } from '../../shared/middlewares/requestValidator.middleware';
import { GetMenuPresetRequestParamsSchema, MenuRequestBodySchema } from './menu.schema';

const router = Router();

router.post('/', requestValidator({ body: MenuRequestBodySchema }), controller.createMenuRequest);

router.get(
    '/preset/:id',
    requestValidator({ params: GetMenuPresetRequestParamsSchema }),
    controller.getMenuPresetRequest,
);

export default router;
