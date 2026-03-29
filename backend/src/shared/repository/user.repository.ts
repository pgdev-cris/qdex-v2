import PoolManager from '../db/pool.manager';
import { User } from '../types';
import { CreateUserRequest, UpdateUserRequest } from '../../modules/users/users.schema';

const getUsers = async (limit: number = 100, offset: number = 0): Promise<User[]> => {
    const query = `
        SELECT auto_id, user_name, user_fname, user_mname, user_lname,
               user_dept, user_role, user_status, created_at
        FROM tbl_users
        WHERE user_status != 'deleted'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `;
    const users = await PoolManager.query<User[]>(query, [limit, offset]);
    return users ?? [];
};

const getUserById = async (id: number): Promise<User | null> => {
    const query = `
        SELECT auto_id, user_name, user_fname, user_mname, user_lname,
               user_dept, user_role, user_status, created_at
        FROM tbl_users
        WHERE auto_id = ? AND user_status != 'deleted'
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
            (user_name, user_pass, user_fname, user_mname, user_lname, user_dept, user_role, user_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `;
    const result = await PoolManager.execute(query, [
        user.username,
        hashedPassword,
        user.first_name,
        user.middle_name ?? null,
        user.last_name,
        user.department,
        user.role,
    ]);
    return result ? { insertId: result.insertId } : null;
};

const updateUser = async (id: number, data: UpdateUserRequest): Promise<boolean> => {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.first_name !== undefined) {
        fields.push('user_fname = ?');
        params.push(data.first_name);
    }
    if (data.middle_name !== undefined) {
        fields.push('user_mname = ?');
        params.push(data.middle_name);
    }
    if (data.last_name !== undefined) {
        fields.push('user_lname = ?');
        params.push(data.last_name);
    }
    if (data.department !== undefined) {
        fields.push('user_dept = ?');
        params.push(data.department);
    }
    if (data.role !== undefined) {
        fields.push('user_role = ?');
        params.push(data.role);
    }

    if (fields.length === 0) return false;

    params.push(id);
    const query = `UPDATE tbl_users SET ${fields.join(', ')} WHERE auto_id = ? AND user_status != 'deleted'`;
    const result = await PoolManager.execute(query, params);
    return (result?.affectedRows ?? 0) > 0;
};

const setUserStatus = async (
    id: number,
    status: 'active' | 'inactive' | 'deleted',
): Promise<boolean> => {
    const query = `UPDATE tbl_users SET user_status = ? WHERE auto_id = ?`;
    const result = await PoolManager.execute(query, [status, id]);
    return (result?.affectedRows ?? 0) > 0;
};

export default {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    setUserStatus,
};
