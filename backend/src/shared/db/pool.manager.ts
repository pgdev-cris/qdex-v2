import mysql, {
    Pool,
    PoolConnection,
    PoolOptions,
    RowDataPacket,
    ResultSetHeader,
} from 'mysql2/promise';
import { mainDb } from './db.config';

class PoolManager {
    private static pools = new Map<string, Pool>();

    static get(name: string = 'default', config: PoolOptions = mainDb): Pool {
        if (!this.pools.has(name)) {
            const pool = mysql.createPool(config);
            this.pools.set(name, pool);
            console.log(`Pool "${name}" created`);
        }
        return this.pools.get(name)!;
    }

    static async query<T = RowDataPacket[]>(
        sql: string,
        params: any[] = [],
        poolName: string = 'default',
    ): Promise<T> {
        const [rows] = await this.get(poolName).execute(sql, params);
        return rows as T;
    }

    static async execute(
        sql: string,
        params: any[] = [],
        poolName: string = 'default',
    ): Promise<ResultSetHeader> {
        const [result] = await this.get(poolName).execute(sql, params);
        return result as ResultSetHeader;
    }

    static async transaction<T>(
        callback: (connection: PoolConnection) => Promise<T>,
        poolName: string = 'default',
    ): Promise<T> {
        const connection = await this.get(poolName).getConnection();

        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async closeAll() {
        await Promise.all(
            Array.from(this.pools.entries()).map(async ([name, pool]) => {
                await pool.end();
                console.log(`Pool "${name}" closed`);
            }),
        );
        this.pools.clear();
    }
}

export default PoolManager;
