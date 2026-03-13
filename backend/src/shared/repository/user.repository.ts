import PoolManager from '../db/pool.manager';
import { User } from '../types';

const getUsers = async (limit: number = 10, offset: number = 0): Promise<User[]> => {
    const query = `SELECT * FROM tbl_users LIMIT ? OFFSET ?`;

    const users = await PoolManager.query<User[]>(query, [limit, offset], 'auth-pool');

    return users ?? [];
};

export default {
    getUsers,
};
