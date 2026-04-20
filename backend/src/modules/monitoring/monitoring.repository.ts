import PoolManager from '../../shared/db/pool.manager';
import {
    TransactionRow,
    TransactionDetailRow,
    TransactionWithDetails,
    ListTransactionsQuery,
    OverrideLogRow,
} from './monitoring.type';

const listTransactions = async (
    filters: ListTransactionsQuery,
): Promise<{ rows: TransactionRow[]; total: number }> => {
    const { event_id, search, type, status, date_from, date_to, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (event_id !== undefined) {
        conditions.push(`t.event_id = ?`);
        params.push(event_id);
    }

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
        LEFT  JOIN tbl_users    u ON u.id = t.verified_by
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
            CASE
                WHEN u.id IS NULL THEN NULL
                ELSE CONCAT(u.last_name, ', ', u.first_name)
            END AS verified_by,
            t.transacted_at,
            CAST(EXISTS (
                SELECT 1 FROM tbl_override_logs ol
                WHERE ol.transaction_id = t.id AND ol.action_id = 1
            ) AS UNSIGNED) AS is_overridden
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
            CASE
                WHEN u.id IS NULL THEN NULL
                ELSE CONCAT(u.last_name, ', ', u.first_name)
            END AS verified_by,
            t.transacted_at,
            CAST(EXISTS (
                SELECT 1 FROM tbl_override_logs ol
                WHERE ol.transaction_id = t.id AND ol.action_id = 1
            ) AS UNSIGNED) AS is_overridden
        FROM tbl_transactions t
        INNER JOIN tbl_suppliers  v ON v.id = t.supplier_id
        INNER JOIN tbl_events   e ON e.id = t.event_id
        LEFT  JOIN tbl_users    u ON u.id = t.verified_by
        LEFT  JOIN tbl_series   s ON s.code = CONCAT('TRX-', t.event_id)
        WHERE t.id = ?
        LIMIT 1
    `;

    const rows = await PoolManager.query<TransactionRow[]>(sql, [id]);
    const transaction = rows?.[0] ?? null;
    if (!transaction) return null;

    const detailsSql = `
        SELECT
            td.tender_type,
            tt.code  AS tender_code,
            tt.label AS tender_label,
            td.amount,
            td.transaction_count
        FROM tbl_transaction_details td
        LEFT JOIN tbl_tender_types tt ON tt.id = td.tender_type
        WHERE td.transaction_id = ?
        ORDER BY td.tender_type ASC
    `;

    const details = await PoolManager.query<TransactionDetailRow[]>(detailsSql, [id]);

    const overridesSql = `
        SELECT
            o.id,
            o.action_id,
            oas.code  AS action_code,
            oas.label AS action_label,
            o.requester_user_id,
            CASE
                WHEN ru.id IS NULL THEN NULL
                ELSE CONCAT(ru.last_name, ', ', ru.first_name)
            END AS requester_name,
            o.approver_user_id,
            CASE
                WHEN au.id IS NULL THEN NULL
                ELSE CONCAT(au.last_name, ', ', au.first_name)
            END AS approver_name,
            o.remarks,
            o.created_at
        FROM tbl_override_logs o
        LEFT JOIN tbl_override_action_status oas ON oas.id = o.action_id
        LEFT JOIN tbl_users ru ON ru.id = o.requester_user_id
        LEFT JOIN tbl_users au ON au.id = o.approver_user_id
        WHERE o.transaction_id = ?
        ORDER BY o.created_at ASC, o.id ASC
    `;

    const overrides = await PoolManager.query<OverrideLogRow[]>(overridesSql, [id]);

    return { ...transaction, details, overrides: overrides ?? [] };
};

export default { listTransactions, getTransactionById };
