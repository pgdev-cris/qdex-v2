import { RowDataPacket } from 'mysql2/promise';

export type EventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled' | 'deleted';

export interface Event extends RowDataPacket {
    event_id: number;
    event_code: string;
    event_name: string;
    event_category: string | null;
    event_location: string | null;
    event_start_date: string | null;
    event_end_date: string | null;
    event_status: EventStatus;
    created_at: Date;
}
