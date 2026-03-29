import { Router } from 'express';
import controller from './events.controller';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';
import { requestValidator } from '../../shared/middlewares/requestValidator.middleware';
import {
    CreateEventSchema,
    UpdateEventSchema,
    UpdateEventStatusSchema,
    EventIdParamSchema,
} from './events.schema';

const router = Router();

// GET /api/v1/events
router.get('/', jwtValidator, controller.getEventsRequest);

// GET /api/v1/events/:id
router.get(
    '/:id',
    jwtValidator,
    requestValidator({ params: EventIdParamSchema }),
    controller.getEventRequest,
);

// POST /api/v1/events
router.post(
    '/',
    jwtValidator,
    requestValidator({ body: CreateEventSchema }),
    controller.createEventRequest,
);

// PUT /api/v1/events/:id
router.put(
    '/:id',
    jwtValidator,
    requestValidator({ params: EventIdParamSchema, body: UpdateEventSchema }),
    controller.updateEventRequest,
);

// PATCH /api/v1/events/:id/status  — soft delete or change status
router.patch(
    '/:id/status',
    jwtValidator,
    requestValidator({ params: EventIdParamSchema, body: UpdateEventStatusSchema }),
    controller.setEventStatusRequest,
);

export default router;
