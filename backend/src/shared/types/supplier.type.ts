import { RowDataPacket } from 'mysql2/promise';

export interface Supplier extends RowDataPacket {
    id: number;
    code: number;
    name: string;
    status: number;
    created_at: Date;
}
