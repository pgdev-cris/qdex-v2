import PoolManager from '../../shared/db/pool.manager';
import { Event } from '../../shared/types';
import { CreateEventRequest, UpdateEventRequest } from './events.schema';

const POOL = 'auth-pool';

const getEvents = async (): Promise<Event[]> => {
    const query = `
        SELECT event_id, event_code, event_name, event_category,
               event_location, event_start_date, event_end_date, event_status, created_at
        FROM tbl_events
        WHERE event_status != 'deleted'
        ORDER BY event_start_date DESC, event_id DESC
    `;
    return (await PoolManager.query<Event[]>(query, [], POOL)) ?? [];
};

const getEventById = async (id: number): Promise<Event | null> => {
    const query = `
        SELECT event_id, event_code, event_name, event_category,
               event_location, event_start_date, event_end_date, event_status, created_at
        FROM tbl_events
        WHERE event_id = ? AND event_status != 'deleted'
        LIMIT 1
    `;
    const rows = await PoolManager.query<Event[]>(query, [id], POOL);
    return rows?.[0] ?? null;
};

const getEventByCode = async (code: string): Promise<Event | null> => {
    const query = `SELECT event_id FROM tbl_events WHERE event_code = ? LIMIT 1`;
    const rows = await PoolManager.query<Event[]>(query, [code], POOL);
    return rows?.[0] ?? null;
};

const createEvent = async (data: CreateEventRequest): Promise<{ insertId: number } | null> => {
    const query = `
        INSERT INTO tbl_events
            (event_code, event_name, event_category, event_location,
             event_start_date, event_end_date, event_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await PoolManager.execute(
        query,
        [
            data.event_code,
            data.event_name,
            data.event_category ?? null,
            data.event_location ?? null,
            data.event_start_date ?? null,
            data.event_end_date ?? null,
            data.event_status,
        ],
        POOL,
    );
    return result ? { insertId: result.insertId } : null;
};

const updateEvent = async (id: number, data: UpdateEventRequest): Promise<boolean> => {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.event_code !== undefined)       { fields.push('event_code = ?');       params.push(data.event_code); }
    if (data.event_name !== undefined)       { fields.push('event_name = ?');       params.push(data.event_name); }
    if (data.event_category !== undefined)   { fields.push('event_category = ?');   params.push(data.event_category); }
    if (data.event_location !== undefined)   { fields.push('event_location = ?');   params.push(data.event_location); }
    if (data.event_start_date !== undefined) { fields.push('event_start_date = ?'); params.push(data.event_start_date); }
    if (data.event_end_date !== undefined)   { fields.push('event_end_date = ?');   params.push(data.event_end_date); }
    if (data.event_status !== undefined)     { fields.push('event_status = ?');     params.push(data.event_status); }

    if (fields.length === 0) return false;

    params.push(id);
    const query = `UPDATE tbl_events SET ${fields.join(', ')} WHERE event_id = ? AND event_status != 'deleted'`;
    const result = await PoolManager.execute(query, params, POOL);
    return (result?.affectedRows ?? 0) > 0;
};

const setEventStatus = async (
    id: number,
    status: 'upcoming' | 'active' | 'completed' | 'cancelled' | 'deleted',
): Promise<boolean> => {
    const query = `UPDATE tbl_events SET event_status = ? WHERE event_id = ?`;
    const result = await PoolManager.execute(query, [status, id], POOL);
    return (result?.affectedRows ?? 0) > 0;
};

export default {
    getEvents,
    getEventById,
    getEventByCode,
    createEvent,
    updateEvent,
    setEventStatus,
};
