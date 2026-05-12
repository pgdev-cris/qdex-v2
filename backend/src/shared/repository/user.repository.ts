import PoolManager from '../db/pool.manager';
import { User } from '../types';
import { CreateUserRequest, UpdateUserRequest } from '../../modules/users/users.schema';

const getUsers = async (limit: number = 100, offset: number = 0): Promise<User[]> => {
    const query = `
        SELECT id, username, first_name, middle_name, last_name,
               department, role, status, created_at, employee_no, menu_preset_id,
               CAST(can_override AS UNSIGNED) AS can_override
        FROM tbl_users
        WHERE status != 9
        ORDER BY created_at DESC
        LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}
    `;
    const users = await PoolManager.query<User[]>(query, []);
    return users ?? [];
};

const getUserById = async (id: number): Promise<User | null> => {
    const query = `
        SELECT id, username, first_name, middle_name, last_name,
               department, role, status, created_at, employee_no, menu_preset_id,
               CAST(can_override AS UNSIGNED) AS can_override
        FROM tbl_users
        WHERE id = ? AND status != 9
        LIMIT 1
    `;
    const rows = await PoolManager.query<User[]>(query, [id]);
    return rows?.[0] ?? null;
};

const createUser = async (
    user: CreateUserRequest,
    hashedPassword: string,
): Promise<{ insertId: number } | null> => {
    const query = `
        INSERT INTO tbl_users
            (username, password, first_name, middle_name, last_name, department, role, status, employee_no, menu_preset_id, can_override, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, NOW())
    `;
    const result = await PoolManager.execute(query, [
        user.username,
        hashedPassword,
        user.first_name,
        user.middle_name ?? null,
        user.last_name,
        user.department,
        user.role,
        user.employee_no,
        user.menu_preset_id ?? null,
        user.can_override ?? 0,
    ]);
    return result ? { insertId: result.insertId } : null;
};

const updateUser = async (id: number, data: UpdateUserRequest): Promise<boolean> => {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.first_name !== undefined) {
        fields.push('first_name = ?');
        params.push(data.first_name);
    }
    if (data.middle_name !== undefined) {
        fields.push('middle_name = ?');
        params.push(data.middle_name);
    }
    if (data.last_name !== undefined) {
        fields.push('last_name = ?');
        params.push(data.last_name);
    }
    if (data.department !== undefined) {
        fields.push('department = ?');
        params.push(data.department);
    }
    if (data.role !== undefined) {
        fields.push('role = ?');
        params.push(data.role);
    }
    if (data.employee_no !== undefined) {
        fields.push('employee_no = ?');
        params.push(data.employee_no);
    }
    if ('menu_preset_id' in data) {
        fields.push('menu_preset_id = ?');
        params.push(data.menu_preset_id ?? null);
    }
    if (data.can_override !== undefined) {
        fields.push('can_override = ?');
        params.push(data.can_override);
    }

    if (fields.length === 0) return false;

    params.push(id);
    const query = `UPDATE tbl_users SET ${fields.join(', ')} WHERE id = ? AND status != 9`;
    const result = await PoolManager.execute(query, params);
    return (result?.affectedRows ?? 0) > 0;
};

const setUserStatus = async (id: number, status: number): Promise<boolean> => {
    const query = `UPDATE tbl_users SET status = ? WHERE id = ?`;
    const result = await PoolManager.execute(query, [status, id]);
    return (result?.affectedRows ?? 0) > 0;
};

const getUserPasswordById = async (id: number): Promise<string | null> => {
    const query = `SELECT password FROM tbl_users WHERE id = ? AND status != 9 LIMIT 1`;
    const rows = await PoolManager.query<{ password: string }[]>(query, [id]);
    return rows?.[0]?.password ?? null;
};

const changePassword = async (id: number, hashedPassword: string): Promise<boolean> => {
    const query = `UPDATE tbl_users SET password = ? WHERE id = ? AND status != 9`;
    const result = await PoolManager.execute(query, [hashedPassword, id]);
    return (result?.affectedRows ?? 0) > 0;
};

export default {
    getUsers,
    getUserById,
    getUserPasswordById,
    createUser,
    updateUser,
    setUserStatus,
    changePassword,
};
