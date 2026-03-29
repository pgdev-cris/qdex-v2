import { RowDataPacket } from 'mysql2/promise';

export interface Supplier extends RowDataPacket {
    supplier_id: number;
    supplier_code: string;
    supplier_name: string;
    supplier_status: 'active' | 'inactive' | 'deleted';
    created_at: Date;
}
