import PoolManager from '../db/pool.manager';
import { Vendor } from '../types/vendor.type';

const getVendorByCode = async (code: number): Promise<Vendor | null> => {
    const query = `SELECT * FROM tbl_vendors WHERE code = ?`;
    const rows = await PoolManager.query<Vendor[]>(query, [code]);
    return rows?.[0] ?? null;
};

export default { getVendorByCode };
