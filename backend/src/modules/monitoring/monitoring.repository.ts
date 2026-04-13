import PoolManager from '../../shared/db/pool.manager';
import {
    TransactionRow,
    TransactionDetailRow,
    TransactionWithDetails,
    ListTransactionsQuery,
} from './monitoring.type';

const listTransactions = async (
    filters: ListTransactionsQuery,
): Promise<{ rows: TransactionRow[]; total: number }> => {
    const { search, type, status, date_from, date_to, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
        conditions.push(
            `(v.name LIKE ? OR CAST(v.code AS CHAR) LIKE ? OR t.reference_code LIKE ?)`,
        );
        const like = `%${search}%`;
        params.push(like, like, like);
    }

    if (type !== undefined) {
        conditions.push(`t.type = ?`);
        params.push(type);
    }

    if (status !== undefined) {
        conditions.push(`t.status = ?`);
        params.push(status);
    }

    if (date_from) {
        conditions.push(`DATE(t.transacted_at) >= ?`);
        params.push(date_from);
    }

    if (date_to) {
        conditions.push(`DATE(t.transacted_at) <= ?`);
        params.push(date_to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
        FROM tbl_transactions t
        INNER JOIN tbl_suppliers  v ON v.id = t.supplier_id
        INNER JOIN tbl_events   e ON e.id = t.event_id
        LEFT  JOIN tbl_series   s ON s.code = CONCAT('TRX-', t.event_id)
        ${where}
    `;

    const countSql = `SELECT COUNT(*) AS total ${baseQuery}`;
    const countRows = await PoolManager.query<{ total: number }[]>(countSql, params);
    const total = countRows[0]?.total ?? 0;

    const dataSql = `
        SELECT
            t.id,
            CONCAT(COALESCE(s.prefix, ''), LPAD(t.transaction_no, COALESCE(s.pad_length, 6), '0')) AS receipt_no,
            t.reference_code,
            v.code  AS supplier_code,
            v.name  AS supplier_name,
            e.name  AS event_name,
            e.code  AS event_code,
            t.type,
            t.type  AS remit_type,
            t.status,
            t.total_amount,
            t.remitted_by,
            t.transacted_at
        ${baseQuery}
        ORDER BY t.id DESC
        LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}
    `;

    const rows = await PoolManager.query<TransactionRow[]>(dataSql, params);

    return { rows, total };
};

const getTransactionById = async (id: number): Promise<TransactionWithDetails | null> => {
    const sql = `
        SELECT
            t.id,
            CONCAT(COALESCE(s.prefix, ''), LPAD(t.transaction_no, COALESCE(s.pad_length, 6), '0')) AS receipt_no,
            t.reference_code,
            v.code  AS supplier_code,
            v.name  AS supplier_name,
            e.name  AS event_name,
            e.code  AS event_code,
            t.type,
            t.type  AS remit_type,
            t.status,
            t.total_amount,
            t.remitted_by,
            t.transacted_at
        FROM tbl_transactions t
        INNER JOIN tbl_suppliers  v ON v.id = t.supplier_id
        INNER JOIN tbl_events   e ON e.id = t.event_id
        LEFT  JOIN tbl_series   s ON s.code = CONCAT('TRX-', t.event_id)
        WHERE t.id = ?
        LIMIT 1
    `;

    const rows = await PoolManager.query<TransactionRow[]>(sql, [id]);
    const transaction = rows?.[0] ?? null;
    if (!transaction) return null;

    const detailsSql = `
        SELECT tender_type, amount, transaction_count
        FROM tbl_transaction_details
        WHERE transaction_id = ?
        ORDER BY tender_type ASC
    `;

    const details = await PoolManager.query<TransactionDetailRow[]>(detailsSql, [id]);

    return { ...transaction, details };
};

export default { listTransactions, getTransactionById };
