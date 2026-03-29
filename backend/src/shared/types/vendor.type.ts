import { RowDataPacket } from 'mysql2/promise';

export interface Vendor extends RowDataPacket {
    id: number;
    name: string;
    code: number;
    status?: number;
}
