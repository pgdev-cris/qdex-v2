import { RowDataPacket } from 'mysql2/promise';

export interface User extends RowDataPacket {
    id: number;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    middle_name: string | null;
    department: string;
    role: string;
    status: number;
    created_at: Date;
    employee_no: string | null;
    menu_preset_id: number | null;
    can_override: number;
}
