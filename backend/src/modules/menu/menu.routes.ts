import { Router } from 'express';
import controller from './menu.controllers';
import { requestValidator } from '../../shared/middlewares/requestValidator.middleware';
import { GetMenuPresetRequestParamsSchema, MenuRequestBodySchema } from './menu.schema';

const router = Router();

router.post('/', requestValidator({ body: MenuRequestBodySchema }), controller.createMenuRequest);

// GET /api/v1/menu/presets — list all presets (id + name) for dropdowns
router.get('/presets', controller.getAllPresetsRequest);

router.get(
    '/preset/:id',
    requestValidator({ params: GetMenuPresetRequestParamsSchema }),
    controller.getMenuPresetRequest,
);

export default router;
