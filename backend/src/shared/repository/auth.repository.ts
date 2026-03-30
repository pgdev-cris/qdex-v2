import { RowDataPacket } from 'mysql2/promise';
import PoolManager from '../db/pool.manager';
import { User } from '../types';

interface UserMenuPresetRow extends RowDataPacket {
    menu_preset_id: number;
}

const getUserByUsername = async (username: string): Promise<User | null> => {
    const query = `SELECT * FROM tbl_users WHERE username = ? AND status = 1`;

    const [rows] = await PoolManager.get('auth-pool').query<User[]>(query, [username]);

    return rows[0] ?? null;
};

const getUserMenuPresetId = async (userId: number): Promise<number | null> => {
    const query = `SELECT menu_preset_id FROM tbl_users_menu_preset WHERE user_id = ? LIMIT 1`;

    const [rows] = await PoolManager.get('auth-pool').query<UserMenuPresetRow[]>(query, [userId]);

    return rows[0]?.menu_preset_id ?? null;
};

export default {
    getUserByUsername,
    getUserMenuPresetId,
};
