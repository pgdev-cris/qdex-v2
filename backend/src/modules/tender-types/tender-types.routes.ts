import { Router } from 'express';
import controller from './tender-types.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';

const router = Router();

// GET /tender-types — list all tender types ordered by sort
router.get('/', jwtValidator, controller.getAllRequest);

export default router;
