import PoolManager from '../db/pool.manager';
import { User } from '../types';

const getUserByUsername = async (username: string): Promise<User | null> => {
    const query = `SELECT * FROM tbl_users WHERE user_name = ?`;

    const [rows] = await PoolManager.get('auth-pool').query<User[]>(query, [username]);

    return rows[0] ?? null;
};

export default {
    getUserByUsername,
};
