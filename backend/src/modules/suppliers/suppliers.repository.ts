import PoolManager from '../../shared/db/pool.manager';
import { Supplier } from '../../shared/types';
import { CreateSupplierRequest, UpdateSupplierRequest } from './suppliers.schema';

const POOL = 'auth-pool';

const getSuppliers = async (): Promise<Supplier[]> => {
    const query = `
        SELECT supplier_id, supplier_code, supplier_name, supplier_status, created_at
        FROM tbl_suppliers
        WHERE supplier_status != 'deleted'
        ORDER BY supplier_code ASC
    `;
    return (await PoolManager.query<Supplier[]>(query, [], POOL)) ?? [];
};

const getSupplierById = async (id: number): Promise<Supplier | null> => {
    const query = `
        SELECT supplier_id, supplier_code, supplier_name, supplier_status, created_at
        FROM tbl_suppliers
        WHERE supplier_id = ? AND supplier_status != 'deleted'
        LIMIT 1
    `;
    const rows = await PoolManager.query<Supplier[]>(query, [id], POOL);
    return rows?.[0] ?? null;
};

const getSupplierByCode = async (code: string): Promise<Supplier | null> => {
    const query = `
        SELECT supplier_id FROM tbl_suppliers WHERE supplier_code = ? LIMIT 1
    `;
    const rows = await PoolManager.query<Supplier[]>(query, [code], POOL);
    return rows?.[0] ?? null;
};

const createSupplier = async (data: CreateSupplierRequest): Promise<{ insertId: number } | null> => {
    const query = `
        INSERT INTO tbl_suppliers (supplier_code, supplier_name, supplier_status)
        VALUES (?, ?, 'active')
    `;
    const result = await PoolManager.execute(query, [data.supplier_code, data.supplier_name], POOL);
    return result ? { insertId: result.insertId } : null;
};

const updateSupplier = async (id: number, data: UpdateSupplierRequest): Promise<boolean> => {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.supplier_code !== undefined) { fields.push('supplier_code = ?'); params.push(data.supplier_code); }
    if (data.supplier_name !== undefined) { fields.push('supplier_name = ?'); params.push(data.supplier_name); }

    if (fields.length === 0) return false;

    params.push(id);
    const query = `UPDATE tbl_suppliers SET ${fields.join(', ')} WHERE supplier_id = ? AND supplier_status != 'deleted'`;
    const result = await PoolManager.execute(query, params, POOL);
    return (result?.affectedRows ?? 0) > 0;
};

const setSupplierStatus = async (id: number, status: 'active' | 'inactive' | 'deleted'): Promise<boolean> => {
    const query = `UPDATE tbl_suppliers SET supplier_status = ? WHERE supplier_id = ?`;
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
