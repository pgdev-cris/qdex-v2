import PoolManager from '../../shared/db/pool.manager';
import { RemittanceRecord, RemittanceSummary } from '../../shared/types';
import { RemittanceReportQuery, TransactionReportQuery } from './reports.schema';

const POOL = 'auth-pool';

interface FilterResult {
    clauses: string[];
    params: unknown[];
}

/**
 * Builds shared WHERE clauses from the report query filters.
 */
const buildFilters = (query: RemittanceReportQuery): FilterResult => {
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
    if (query.supplier_code) {
        clauses.push('v.code = ?');
        params.push(Number(query.supplier_code));
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
};

const getRemittances = async (query: RemittanceReportQuery): Promise<RemittanceRecord[]> => {
    const { clauses, params } = buildFilters(query);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Number(query.limit ?? 100);
    const offset = Number(query.offset ?? 0);

    const sql = `
        SELECT
            r.remittance_id,
            r.supplier_code,
            v.name AS supplier_name,
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
        INNER JOIN tbl_transactions t ON t.reference_code = r.reference_code
        INNER JOIN tbl_suppliers v ON v.id = t.supplier_id
        ${where}
        ORDER BY r.remitted_at DESC
        LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}
    `;

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
            r.remittance_id, r.supplier_code,
            v.name AS supplier_name,
            r.event_code, r.total_cash, r.total_gcash, r.total_pwallet,
            r.total_credit_card, r.total_debit_card, r.total_credit,
            r.grand_total, r.reference_code, r.is_partial,
            r.remitted_by, r.received_by, r.remitted_at, r.created_at
        FROM tbl_remittances r
        INNER JOIN tbl_transactions t ON t.reference_code = r.reference_code
        INNER JOIN tbl_suppliers v ON v.id = t.supplier_id
        WHERE r.remittance_id = ?
        LIMIT 1
    `;
    const rows = await PoolManager.query<RemittanceRecord[]>(sql, [id], POOL);
    return rows?.[0] ?? null;
};

export interface TransactionReportRow {
    id: number;
    receipt_no: string;
    reference_code: string;
    supplier_code: number;
    supplier_name: string;
    event_code: string;
    event_name: string;
    type: number;
    status: number;
    total_amount: number;
    remitted_by: string;
    transacted_at: string;
}

const getTransactions = async (query: TransactionReportQuery): Promise<TransactionReportRow[]> => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.from) {
        conditions.push('DATE(t.transacted_at) >= ?');
        params.push(query.from);
    }
    if (query.to) {
        conditions.push('DATE(t.transacted_at) <= ?');
        params.push(query.to);
    }
    if (query.supplier_code) {
        conditions.push('v.code = ?');
        params.push(Number(query.supplier_code));
    }
    if (query.event_code) {
        conditions.push('e.code = ?');
        params.push(query.event_code.toUpperCase());
    }
    if (query.type !== undefined) {
        conditions.push('t.type = ?');
        params.push(Number(query.type));
    }
    if (query.status !== undefined) {
        conditions.push('t.status = ?');
        params.push(Number(query.status));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.floor(Number(query.limit ?? 5000));
    const offset = Math.floor(Number(query.offset ?? 0));

    const sql = `
        SELECT
            t.id,
            CONCAT(COALESCE(s.prefix, ''), LPAD(t.transaction_no, COALESCE(s.pad_length, 6), '0')) AS receipt_no,
            t.reference_code,
            v.code  AS supplier_code,
            v.name  AS supplier_name,
            e.code  AS event_code,
            e.name  AS event_name,
            t.type,
            t.status,
            t.total_amount,
            t.remitted_by,
            t.transacted_at
        FROM tbl_transactions t
        INNER JOIN tbl_suppliers v ON v.id = t.supplier_id
        INNER JOIN tbl_events   e ON e.id = t.event_id
        LEFT  JOIN tbl_series   s ON s.code = 'TRX'
        ${where}
        ORDER BY t.id DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    return (await PoolManager.query<TransactionReportRow[]>(sql, params, POOL)) ?? [];
};

// Raw row returned by the SQL — one row per supplier × event × tender_type
export interface SupplierTenderRawRow {
    supplier_code: number;
    supplier_name: string;
    event_code: string;
    event_name: string;
    tender_type_id: number;
    tender_name: string;
    total: number;
}

const getSupplierPerTender = async (
    query: TransactionReportQuery,
): Promise<SupplierTenderRawRow[]> => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.from) {
        conditions.push('DATE(t.transacted_at) >= ?');
        params.push(query.from);
    }
    if (query.to) {
        conditions.push('DATE(t.transacted_at) <= ?');
        params.push(query.to);
    }
    if (query.supplier_code) {
        conditions.push('v.code = ?');
        params.push(Number(query.supplier_code));
    }
    if (query.event_code) {
        conditions.push('e.code = ?');
        params.push(query.event_code.toUpperCase());
    }
    if (query.status !== undefined) {
        conditions.push('t.status = ?');
        params.push(Number(query.status));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // One row per supplier × event × tender_type — pivoting is done in the service layer
    const sql = `
        SELECT
            v.code       AS supplier_code,
            v.name       AS supplier_name,
            e.code       AS event_code,
            e.name       AS event_name,
            tt.id        AS tender_type_id,
            tt.label     AS tender_name,
            COALESCE(SUM(td.amount), 0) AS total
        FROM tbl_transactions t
        INNER JOIN tbl_suppliers           v  ON v.id  = t.supplier_id
        INNER JOIN tbl_events              e  ON e.id  = t.event_id
        INNER JOIN tbl_transaction_details td ON td.transaction_id = t.id
        INNER JOIN tbl_tender_types        tt ON tt.id = td.tender_type
        ${where}
        GROUP BY v.id, v.code, v.name, e.id, e.code, e.name, tt.id, tt.label
        ORDER BY e.code ASC, v.code ASC, tt.id ASC
    `;

    return (await PoolManager.query<SupplierTenderRawRow[]>(sql, params, POOL)) ?? [];
};

export default {
    getRemittances,
    getRemittanceSummary,
    getRemittanceById,
    getTransactions,
    getSupplierPerTender,
};
