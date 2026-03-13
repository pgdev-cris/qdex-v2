import {RowDataPacket} from "mysql2/promise";

export interface LoginRequestBody {
    username: string;
    password: string;
}

export interface User extends RowDataPacket {
    auto_id: number;
    user_name: string;
    user_pass: string;
    user_fname: string;
    user_lname: string;
    user_mname: string | null;
    user_dept: string;
    user_role: string;
    user_status: string;
}