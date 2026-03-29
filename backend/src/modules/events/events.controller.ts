import { Request, Response } from 'express';
import service from './events.service';
import { HTTP_STATUS } from '../../shared/constants';
import { CreateEventRequest, UpdateEventRequest, UpdateEventStatus } from './events.schema';

const getEventsRequest = async (req: Request, res: Response) => {
    const events = await service.getEvents();
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Events fetched successfully',
        data: events,
    });
};

const getEventRequest = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const event = await service.getEventById(id);
    if (!event) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: HTTP_STATUS.NOT_FOUND,
            message: 'Event not found',
        });
    }
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Event fetched successfully',
        data: event,
    });
};

const createEventRequest = async (req: Request, res: Response) => {
    try {
        const data = req.body as CreateEventRequest;
        const result = await service.createEvent(data);
        return res.status(HTTP_STATUS.CREATED).json({
            status: HTTP_STATUS.CREATED,
            message: 'Event created successfully',
            data: result,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create event';
        return res.status(HTTP_STATUS.CONFLICT).json({
            status: HTTP_STATUS.CONFLICT,
            message,
        });
    }
};

const updateEventRequest = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const data = req.body as UpdateEventRequest;
        const updated = await service.updateEvent(id, data);
        if (!updated) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                status: HTTP_STATUS.NOT_FOUND,
                message: 'Event not found',
            });
        }
        return res.status(HTTP_STATUS.OK).json({
            status: HTTP_STATUS.OK,
            message: 'Event updated successfully',
            data: updated,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update event';
        return res.status(HTTP_STATUS.CONFLICT).json({
            status: HTTP_STATUS.CONFLICT,
            message,
        });
    }
};

const setEventStatusRequest = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const payload = req.body as UpdateEventStatus;
    const result = await service.setEventStatus(id, payload);
    if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: HTTP_STATUS.NOT_FOUND,
            message: 'Event not found',
        });
    }
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: `Event status set to ${payload.status}`,
        data: result,
    });
};

export default {
    getEventsRequest,
    getEventRequest,
    createEventRequest,
    updateEventRequest,
    setEventStatusRequest,
};
