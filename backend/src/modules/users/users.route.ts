import { Router } from 'express';
import controller from './users.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';

const router = Router();

router.get('/', jwtValidator, controller.getUsers);

export default router;
