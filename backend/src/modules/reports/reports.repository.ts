import PoolManager from '../../shared/db/pool.manager';
import { RemittanceRecord, RemittanceSummary } from '../../shared/types';
import { RemittanceReportQuery } from './reports.schema';

const POOL = 'auth-pool';

interface FilterResult {
    clauses: string[];
    params: unknown[];
}

/**
 * Builds shared WHERE clauses from the report query filters.
 */
function buildFilters(query: RemittanceReportQuery): FilterResult {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (query.from) {
        clauses.push('DATE(r.remitted_at) >= ?');
        params.push(query.from);
    }
    if (query.to) {
        clauses.push('DATE(r.remitted_at) <= ?');
        params.push(query.to);
    }
    if (query.vendor_code) {
        clauses.push('r.vendor_code = ?');
        params.push(query.vendor_code.toUpperCase());
    }
    if (query.event_code) {
        clauses.push('r.event_code = ?');
        params.push(query.event_code.toUpperCase());
    }
    if (query.is_partial !== undefined) {
        clauses.push('r.is_partial = ?');
        params.push(query.is_partial === 'true' ? 1 : 0);
    }

    return { clauses, params };
}

const getRemittances = async (query: RemittanceReportQuery): Promise<RemittanceRecord[]> => {
    const { clauses, params } = buildFilters(query);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Number(query.limit ?? 100);
    const offset = Number(query.offset ?? 0);

    const sql = `
        SELECT
            r.remittance_id,
            r.vendor_code,
            s.supplier_name AS vendor_name,
            r.event_code,
            r.total_cash,
            r.total_gcash,
            r.total_pwallet,
            r.total_credit_card,
            r.total_debit_card,
            r.total_credit,
            r.grand_total,
            r.reference_code,
            r.is_partial,
            r.remitted_by,
            r.received_by,
            r.remitted_at,
            r.created_at
        FROM tbl_remittances r
        LEFT JOIN tbl_suppliers s ON s.supplier_code = r.vendor_code
        ${where}
        ORDER BY r.remitted_at DESC
        LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    return (await PoolManager.query<RemittanceRecord[]>(sql, params, POOL)) ?? [];
};

const getRemittanceSummary = async (
    query: RemittanceReportQuery,
): Promise<RemittanceSummary | null> => {
    const { clauses, params } = buildFilters(query);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const sql = `
        SELECT
            COUNT(*) AS total_transactions,
            COALESCE(SUM(r.total_cash), 0)   AS total_cash,
            COALESCE(SUM(r.total_credit), 0) AS total_credit,
            COALESCE(SUM(r.grand_total), 0)  AS grand_total
        FROM tbl_remittances r
        ${where}
    `;

    const rows = await PoolManager.query<RemittanceSummary[]>(sql, params, POOL);
    return rows?.[0] ?? null;
};

const getRemittanceById = async (id: number): Promise<RemittanceRecord | null> => {
    const sql = `
        SELECT
            r.remittance_id, r.vendor_code,
            s.supplier_name AS vendor_name,
            r.event_code, r.total_cash, r.total_gcash, r.total_pwallet,
            r.total_credit_card, r.total_debit_card, r.total_credit,
            r.grand_total, r.reference_code, r.is_partial,
            r.remitted_by, r.received_by, r.remitted_at, r.created_at
        FROM tbl_remittances r
        LEFT JOIN tbl_suppliers s ON s.supplier_code = r.vendor_code
        WHERE r.remittance_id = ?
        LIMIT 1
    `;
    const rows = await PoolManager.query<RemittanceRecord[]>(sql, [id], POOL);
    return rows?.[0] ?? null;
};

export default {
    getRemittances,
    getRemittanceSummary,
    getRemittanceById,
};
