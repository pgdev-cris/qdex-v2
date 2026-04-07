import PoolManager from '../../shared/db/pool.manager';
import { Supplier } from '../../shared/types';
import { CreateSupplierRequest, UpdateSupplierRequest } from './suppliers.schema';

const POOL = 'auth-pool';

const getSuppliers = async (): Promise<Supplier[]> => {
    const query = `
        SELECT id, code, name, status, created_at
        FROM tbl_suppliers
        WHERE status != 9
        ORDER BY code ASC
    `;
    return (await PoolManager.query<Supplier[]>(query, [], POOL)) ?? [];
};

const getSupplierById = async (id: number): Promise<Supplier | null> => {
    const query = `
        SELECT id, code, name, status, created_at
        FROM tbl_suppliers
        WHERE id = ? AND status != 9
        LIMIT 1
    `;
    const rows = await PoolManager.query<Supplier[]>(query, [id], POOL);
    return rows?.[0] ?? null;
};

const getSupplierByCode = async (code: number): Promise<Supplier | null> => {
    const query = `
        SELECT * FROM tbl_suppliers WHERE code = ? LIMIT 1
    `;
    const rows = await PoolManager.query<Supplier[]>(query, [code], POOL);
    return rows?.[0] ?? null;
};

const createSupplier = async (
    data: CreateSupplierRequest,
): Promise<{ insertId: number } | null> => {
    const query = `
        INSERT INTO tbl_suppliers (code, name, status)
        VALUES (?, ?, 1)
    `;
    const result = await PoolManager.execute(query, [data.code, data.name], POOL);
    return result ? { insertId: result.insertId } : null;
};

const updateSupplier = async (id: number, data: UpdateSupplierRequest): Promise<boolean> => {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.code !== undefined) {
        fields.push('code = ?');
        params.push(data.code);
    }
    if (data.name !== undefined) {
        fields.push('name = ?');
        params.push(data.name);
    }

    if (fields.length === 0) return false;

    params.push(id);
    const query = `UPDATE tbl_suppliers SET ${fields.join(', ')} WHERE id = ? AND status != 9`;
    const result = await PoolManager.execute(query, params, POOL);
    return (result?.affectedRows ?? 0) > 0;
};

const setSupplierStatus = async (id: number, status: number): Promise<boolean> => {
    const query = `UPDATE tbl_suppliers SET status = ? WHERE id = ?`;
    const result = await PoolManager.execute(query, [status, id], POOL);
    return (result?.affectedRows ?? 0) > 0;
};

export default {
    getSuppliers,
    getSupplierById,
    getSupplierByCode,
    createSupplier,
    updateSupplier,
    setSupplierStatus,
};
