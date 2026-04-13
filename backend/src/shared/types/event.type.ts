import { RowDataPacket } from 'mysql2/promise';

export interface Event extends RowDataPacket {
    id: number;
    name: string;
    code: string;
    period_start: string | null;
    period_end: string | null;
    status: 0 | 1; // 0 = inactive, 1 = active
}
