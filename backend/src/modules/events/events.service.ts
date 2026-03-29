import repository from './events.repository';
import { CreateEventRequest, UpdateEventRequest, UpdateEventStatus } from './events.schema';

const getEvents = async () => {
    return await repository.getEvents();
};

const getEventById = async (id: number) => {
    return await repository.getEventById(id);
};

const createEvent = async (data: CreateEventRequest) => {
    const existing = await repository.getEventByCode(data.event_code);
    if (existing) {
        throw new Error(`Event code "${data.event_code}" is already in use.`);
    }
    return await repository.createEvent(data);
};

const updateEvent = async (id: number, data: UpdateEventRequest) => {
    const exists = await repository.getEventById(id);
    if (!exists) return null;

    if (data.event_code && data.event_code !== exists.event_code) {
        const duplicate = await repository.getEventByCode(data.event_code);
        if (duplicate) {
            throw new Error(`Event code "${data.event_code}" is already in use.`);
        }
    }

    await repository.updateEvent(id, data);
    return await repository.getEventById(id);
};

const setEventStatus = async (id: number, payload: UpdateEventStatus) => {
    const exists = await repository.getEventById(id);
    // Allow setting deleted even if already soft-deleted (for idempotency via code)
    if (!exists && payload.status !== 'deleted') return null;
    await repository.setEventStatus(id, payload.status);
    return { id, status: payload.status };
};

export default {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    setEventStatus,
};
