import { PoolConnection } from 'mysql2/promise';
import PoolManager from '../../shared/db/pool.manager';

//  Types

export interface InsertTransactionData {
    event_id: number;
    supplier_id: number;
    transaction_no: number;
    transacted_at: Date;
    total_amount: number;
    reference_code: string;
    remitted_by: string;
    verified_by: number;
    verified_at: Date;
    status: number;
    type: number;
}

export interface InsertDetailData {
    transaction_id: number;
    tender_type: number;
    amount: number;
    transaction_count: number;
}

//  Queries

const createTransaction = async (
    conn: PoolConnection,
    data: InsertTransactionData,
): Promise<number> => {
    const [result] = await conn.execute(
        `INSERT INTO tbl_transactions
            (event_id, supplier_id, transaction_no, transacted_at, total_amount, reference_code,
             remitted_by, verified_by, verified_at, status, type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.event_id,
            data.supplier_id,
            data.transaction_no,
            data.transacted_at,
            data.total_amount,
            data.reference_code,
            data.remitted_by,
            data.verified_by,
            data.verified_at,
            data.status,
            data.type,
        ],
    );

    return (result as { insertId: number }).insertId;
};

const createTransactionDetails = async (
    conn: PoolConnection,
    details: InsertDetailData[],
): Promise<void> => {
    if (details.length === 0) return;

    const placeholders = details.map(() => '(?, ?, ?, ?)').join(', ');
    const params = details.flatMap((d) => [
        d.transaction_id,
        d.tender_type,
        d.amount,
        d.transaction_count,
    ]);

    await conn.execute(
        `INSERT INTO tbl_transaction_details
            (transaction_id, tender_type, amount, transaction_count)
         VALUES ${placeholders}`,
        params,
    );
};

export interface InsertOverrideLogData {
    transaction_id: number;
    requester_user_id: number;
    approver_user_id: number;
    remarks: string;
}

const createOverrideLog = async (
    conn: PoolConnection,
    data: InsertOverrideLogData,
): Promise<void> => {
    await conn.execute(
        `INSERT INTO tbl_override_logs
            (transaction_id, requester_user_id, approver_user_id, remarks, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [data.transaction_id, data.requester_user_id, data.approver_user_id, data.remarks],
    );
};

export interface PartialTransactionRow {
    receipt_no: string;
    reference_code: string;
    cash_amount: number;
    transacted_at: Date;
}

export interface PartialCashSummary {
    total_cash: number;
    count: number;
    transactions: PartialTransactionRow[];
}

/**
 * Returns each non-voided CASH partial remittance for a supplier today,
 * plus a pre-computed total and count.
 */
const getPartialCashSummary = async (
    supplierCode: number,
    eventId: number,
): Promise<PartialCashSummary> => {
    const rowSql = `
        SELECT
            CONCAT(COALESCE(sr.prefix, ''), LPAD(t.transaction_no, COALESCE(sr.pad_length, 6), '0')) AS receipt_no,
            t.reference_code,
            td.amount      AS cash_amount,
            t.transacted_at
        FROM tbl_transactions      t
        INNER JOIN tbl_suppliers   s  ON s.id  = t.supplier_id
        INNER JOIN tbl_transaction_details td ON td.transaction_id = t.id
        LEFT  JOIN tbl_series      sr ON sr.code = CONCAT('TRX-', t.event_id)
        WHERE s.id            = ?
          AND t.event_id        = ?
          AND t.type            = 1       -- PARTIAL
          AND t.status         != 2       -- not VOIDED
          AND DATE(t.transacted_at) = CURDATE()
          AND td.tender_type   = 1        -- CASH
        ORDER BY t.id ASC
    `;

    const rows = await PoolManager.query<PartialTransactionRow[]>(rowSql, [supplierCode, eventId]);
    const transactions = rows ?? [];

    const total_cash = transactions.reduce((s, r) => s + Number(r.cash_amount), 0);
    const count = transactions.length;

    return { total_cash, count, transactions };
};

const updateTransactionStatus = async (
    conn: PoolConnection,
    id: number,
    status: number,
): Promise<void> => {
    await conn.execute('UPDATE tbl_transactions SET status = ? WHERE id = ?', [status, id]);
};

export default {
    createTransaction,
    createTransactionDetails,
    createOverrideLog,
    getPartialCashSummary,
    updateTransactionStatus,
};
