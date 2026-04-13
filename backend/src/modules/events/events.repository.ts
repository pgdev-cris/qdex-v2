import PoolManager from '../../shared/db/pool.manager';
import { Event } from '../../shared/types';
import { CreateEventRequest, UpdateEventRequest } from './events.schema';

const getEvents = async (): Promise<Event[]> => {
    const query = `
        SELECT id, name, code, period_start, period_end, status
        FROM tbl_events
        ORDER BY status DESC, id DESC
    `;
    return (await PoolManager.query<Event[]>(query, [])) ?? [];
};

const getEventById = async (id: number): Promise<Event | null> => {
    const query = `
        SELECT id, name, code, period_start, period_end, status
        FROM tbl_events
        WHERE id = ?
        LIMIT 1
    `;
    const rows = await PoolManager.query<Event[]>(query, [id]);
    return rows?.[0] ?? null;
};

const getEventByCode = async (code: string): Promise<Event | null> => {
    const query = `SELECT id FROM tbl_events WHERE code = ? LIMIT 1`;
    const rows = await PoolManager.query<Event[]>(query, [code]);
    return rows?.[0] ?? null;
};

const getCurrentEvent = async (): Promise<Event | null> => {
    const query = `
        SELECT id, name, code, period_start, period_end, status
        FROM tbl_events
        WHERE status = 1
        LIMIT 1
    `;
    const rows = await PoolManager.query<Event[]>(query, []);
    return rows?.[0] ?? null;
};

const deactivateAllEvents = async (): Promise<void> => {
    const query = `UPDATE tbl_events SET status = 0 WHERE status = 1`;
    await PoolManager.execute(query, []);
};

const createEvent = async (data: CreateEventRequest): Promise<{ insertId: number } | null> => {
    const query = `
        INSERT INTO tbl_events (name, code, period_start, period_end, status)
        VALUES (?, ?, ?, ?, ?)
    `;
    const result = await PoolManager.execute(query, [
        data.name,
        data.code,
        data.period_start ?? null,
        data.period_end ?? null,
        data.status ?? 0,
    ]);
    return result ? { insertId: result.insertId } : null;
};

const updateEvent = async (id: number, data: UpdateEventRequest): Promise<boolean> => {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
        fields.push('name = ?');
        params.push(data.name);
    }
    if (data.code !== undefined) {
        fields.push('code = ?');
        params.push(data.code);
    }
    if (data.period_start !== undefined) {
        fields.push('period_start = ?');
        params.push(data.period_start);
    }
    if (data.period_end !== undefined) {
        fields.push('period_end = ?');
        params.push(data.period_end);
    }

    if (fields.length === 0) return false;

    params.push(id);
    const query = `UPDATE tbl_events SET ${fields.join(', ')} WHERE id = ?`;
    const result = await PoolManager.execute(query, params);
    return (result?.affectedRows ?? 0) > 0;
};

const setEventStatus = async (id: number, status: 0 | 1): Promise<boolean> => {
    const query = `UPDATE tbl_events SET status = ? WHERE id = ?`;
    const result = await PoolManager.execute(query, [status, id]);
    return (result?.affectedRows ?? 0) > 0;
};

export default {
    getEvents,
    getEventById,
    getEventByCode,
    getCurrentEvent,
    deactivateAllEvents,
    createEvent,
    updateEvent,
    setEventStatus,
};
