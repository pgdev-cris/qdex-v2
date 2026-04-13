import repository from './events.repository';
import SeriesRepository from '../../shared/repository/series.repository';
import { CreateEventRequest, UpdateEventRequest, UpdateEventStatus } from './events.schema';

const getEvents = async () => {
    return await repository.getEvents();
};

const getEventById = async (id: number) => {
    return await repository.getEventById(id);
};

const getCurrentEvent = async () => {
    return await repository.getCurrentEvent();
};

const createEvent = async (data: CreateEventRequest) => {
    const existing = await repository.getEventByCode(data.code);
    if (existing) {
        throw new Error(`Event code "${data.code}" is already in use.`);
    }

    // If creating as active, deactivate all others first
    if (data.status === 1) {
        await repository.deactivateAllEvents();
    }

    const result = await repository.createEvent(data);

    // Provision a fresh transaction counter for this event
    if (result?.insertId) {
        await SeriesRepository.createSeriesForEvent(result.insertId);
    }

    return result;
};

const updateEvent = async (id: number, data: UpdateEventRequest) => {
    const exists = await repository.getEventById(id);
    if (!exists) return null;

    if (data.code && data.code !== exists.code) {
        const duplicate = await repository.getEventByCode(data.code);
        if (duplicate) {
            throw new Error(`Event code "${data.code}" is already in use.`);
        }
    }

    await repository.updateEvent(id, data);
    return await repository.getEventById(id);
};

const setEventStatus = async (id: number, payload: UpdateEventStatus) => {
    const exists = await repository.getEventById(id);
    if (!exists) return null;

    // When activating an event, deactivate all others first
    if (payload.status === 1) {
        await repository.deactivateAllEvents();
    }

    await repository.setEventStatus(id, payload.status);
    return await repository.getEventById(id);
};

export default {
    getEvents,
    getEventById,
    getCurrentEvent,
    createEvent,
    updateEvent,
    setEventStatus,
};
