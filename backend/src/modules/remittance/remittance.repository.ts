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
    /** 1 if this remittance included previous-day unremitted sales, 0 otherwise */
    has_prev_sales: 0 | 1;
    /** 1 if every detail line in this remittance is a previous-day carryover, 0 otherwise */
    is_prev_sales_only: 0 | 1;
}

export interface InsertDetailData {
    transaction_id: number;
    tender_type: number;
    amount: number;
    transaction_count: number;
    /** 1 if this detail line came from the previous day's unremitted sales, 0 otherwise */
    is_prev_sales: 0 | 1;
}

//  Queries

const createTransaction = async (
    conn: PoolConnection,
    data: InsertTransactionData,
): Promise<number> => {
    const [result] = await conn.execute(
        `INSERT INTO tbl_transactions
            (event_id, supplier_id, transaction_no, transacted_at, total_amount, reference_code,
             remitted_by, verified_by, verified_at, status, type, has_prev_sales, is_prev_sales_only)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            data.has_prev_sales,
            data.is_prev_sales_only,
        ],
    );

    return (result as { insertId: number }).insertId;
};

const createTransactionDetails = async (
    conn: PoolConnection,
    details: InsertDetailData[],
): Promise<void> => {
    if (details.length === 0) return;

    const placeholders = details.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const params = details.flatMap((d) => [
        d.transaction_id,
        d.tender_type,
        d.amount,
        d.transaction_count,
        d.is_prev_sales,
    ]);

    await conn.execute(
        `INSERT INTO tbl_transaction_details
            (transaction_id, tender_type, amount, transaction_count, is_prev_sales)
         VALUES ${placeholders}`,
        params,
    );
};

export interface InsertOverrideLogData {
    transaction_id: number;
    action_id: number;
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
            (transaction_id, action_id, requester_user_id, approver_user_id, remarks, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
            data.transaction_id,
            data.action_id,
            data.requester_user_id,
            data.approver_user_id,
            data.remarks,
        ],
    );
};

export interface PartialTransactionRow {
    receipt_no: string;
    reference_code: string;
    cash_amount: number;
    transacted_at: Date;
}

export interface PartialNonCashTransactionRow {
    receipt_no: string;
    reference_code: string;
    amount: number;
    transacted_at: Date;
}

export interface PartialCashSummary {
    total_cash: number;
    count: number;
    transactions: PartialTransactionRow[];
    /** Total remitted today per tender code (e.g. { CASH: 500, GCASH: 200 }) */
    totals_by_method: Record<string, number>;
    /** Per-transaction breakdown for each non-CASH tender remitted today */
    transactions_by_method: Record<string, PartialNonCashTransactionRow[]>;
}

/**
 * Returns each non-voided CASH partial remittance for a supplier today,
 * plus a pre-computed total and count.
 */
const getPartialCashSummary = async (
    supplierCode: number,
    eventId: number,
): Promise<PartialCashSummary> => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());

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
          AND DATE(t.transacted_at) = ?
          AND td.tender_type   = 1        -- CASH
          AND td.is_prev_sales  = 0       -- exclude prev-day portions
        ORDER BY t.id ASC
    `;

    const rows = await PoolManager.query<PartialTransactionRow[]>(rowSql, [
        supplierCode,
        eventId,
        today,
    ]);
    const transactions = rows ?? [];

    const total_cash = transactions.reduce((s, r) => s + Number(r.cash_amount), 0);
    const count = transactions.length;

    // Per-tender totals — covers all tender types used in partial remittances today
    const methodSql = `
        SELECT
            tt.code         AS payment_method,
            SUM(td.amount)  AS total_amount
        FROM tbl_transactions      t
        INNER JOIN tbl_suppliers   s  ON s.id  = t.supplier_id
        INNER JOIN tbl_transaction_details td ON td.transaction_id = t.id
        INNER JOIN tbl_tender_types tt ON tt.id = td.tender_type
        WHERE s.id            = ?
          AND t.event_id      = ?
          AND t.type          = 1       -- PARTIAL
          AND t.status       != 2       -- not VOIDED
          AND DATE(t.transacted_at) = ?
          AND td.is_prev_sales = 0      -- exclude prev-day portions
        GROUP BY tt.code
    `;
    const methodRows = await PoolManager.query<{ payment_method: string; total_amount: number }[]>(
        methodSql,
        [supplierCode, eventId, today],
    );
    const totals_by_method: Record<string, number> = {};
    for (const row of methodRows ?? []) {
        totals_by_method[row.payment_method] = Number(row.total_amount);
    }

    // Per-transaction breakdown for non-CASH tenders
    const nonCashTxSql = `
        SELECT
            tt.code         AS payment_method,
            CONCAT(COALESCE(sr.prefix, ''), LPAD(t.transaction_no, COALESCE(sr.pad_length, 6), '0')) AS receipt_no,
            t.reference_code,
            td.amount,
            t.transacted_at
        FROM tbl_transactions      t
        INNER JOIN tbl_suppliers   s  ON s.id  = t.supplier_id
        INNER JOIN tbl_transaction_details td ON td.transaction_id = t.id
        INNER JOIN tbl_tender_types tt ON tt.id = td.tender_type
        LEFT  JOIN tbl_series      sr ON sr.code = CONCAT('TRX-', t.event_id)
        WHERE s.id            = ?
          AND t.event_id      = ?
          AND t.type          = 1       -- PARTIAL
          AND t.status       != 2       -- not VOIDED
          AND DATE(t.transacted_at) = ?
          AND td.tender_type != 1       -- exclude CASH
          AND td.is_prev_sales = 0      -- exclude prev-day portions
        ORDER BY tt.code ASC, t.id ASC
    `;
    const nonCashTxRows = await PoolManager.query<
        ({ payment_method: string } & PartialNonCashTransactionRow)[]
    >(nonCashTxSql, [supplierCode, eventId, today]);

    const transactions_by_method: Record<string, PartialNonCashTransactionRow[]> = {};
    for (const row of nonCashTxRows ?? []) {
        const { payment_method, ...tx } = row;
        if (!transactions_by_method[payment_method]) {
            transactions_by_method[payment_method] = [];
        }
        transactions_by_method[payment_method].push({
            receipt_no: tx.receipt_no,
            reference_code: tx.reference_code,
            amount: Number(tx.amount),
            transacted_at: tx.transacted_at,
        });
    }

    return { total_cash, count, transactions, totals_by_method, transactions_by_method };
};

export interface FullRemittanceTodayRow {
    reference_code: string;
    receipt_no: string;
}

/**
 * Returns the total partial-remitted amount per tender type for a supplier on a specific date.
 * Uses supplier.code (vendor code) to match the caller's convention.
 * date should be 'YYYY-MM-DD' in Manila time.
 */
const getPartialTotalsByDate = async (
    supplierCode: number,
    eventId: number,
    date: string,
): Promise<Record<string, number>> => {
    const sql = `
        SELECT
            tt.code         AS payment_method,
            SUM(td.amount)  AS total_amount
        FROM tbl_transactions      t
        INNER JOIN tbl_suppliers   s  ON s.id  = t.supplier_id
        INNER JOIN tbl_transaction_details td ON td.transaction_id = t.id
        INNER JOIN tbl_tender_types tt ON tt.id = td.tender_type
        WHERE s.code          = ?
          AND t.event_id      = ?
          AND t.type          = 1       -- PARTIAL
          AND t.status       != 2       -- not VOIDED
          AND DATE(t.transacted_at) = ?
        GROUP BY tt.code
    `;
    const rows = await PoolManager.query<{ payment_method: string; total_amount: number }[]>(
        sql,
        [supplierCode, eventId, date],
    );
    const totals: Record<string, number> = {};
    for (const row of rows ?? []) {
        totals[row.payment_method] = Number(row.total_amount);
    }
    return totals;
};

/**
 * Returns the first verified full remittance for a supplier on a given date, or null.
 * date should be 'YYYY-MM-DD' in Manila time.
 */
const getFullRemittanceByDate = async (
    supplierCode: number,
    eventId: number,
    date: string,
): Promise<FullRemittanceTodayRow | null> => {
    const sql = `
        SELECT
            t.reference_code,
            CONCAT(COALESCE(sr.prefix, ''), LPAD(t.transaction_no, COALESCE(sr.pad_length, 6), '0')) AS receipt_no
        FROM tbl_transactions t
        INNER JOIN tbl_suppliers s  ON s.id = t.supplier_id
        LEFT  JOIN tbl_series    sr ON sr.code = CONCAT('TRX-', t.event_id)
        WHERE s.code      = ?
          AND t.event_id  = ?
          AND t.type      = 2       -- FULL
          AND t.status    = 1       -- VERIFIED only
          AND DATE(t.transacted_at) = ?
        LIMIT 1
    `;
    const rows = await PoolManager.query<FullRemittanceTodayRow[]>(sql, [supplierCode, eventId, date]);
    return rows?.[0] ?? null;
};

/**
 * Returns true if a non-voided transaction with has_prev_sales = 1 already exists
 * for this supplier today. Used by getPrevDaySales to skip showing prev-day sales
 * once they have already been absorbed into a remittance.
 * Uses supplier.code (vendor code). date should be 'YYYY-MM-DD' Manila time.
 */
const hasPrevSalesTransactionByDate = async (
    supplierCode: number,
    eventId: number,
    date: string,
): Promise<boolean> => {
    const sql = `
        SELECT 1
        FROM tbl_transactions t
        INNER JOIN tbl_suppliers s ON s.id = t.supplier_id
        WHERE s.code         = ?
          AND t.event_id     = ?
          AND t.has_prev_sales = 1
          AND t.status      != 2       -- not VOIDED
          AND DATE(t.transacted_at) = ?
        LIMIT 1
    `;
    const rows = await PoolManager.query<{ '1': number }[]>(sql, [supplierCode, eventId, date]);
    return (rows?.length ?? 0) > 0;
};

/** Convenience wrapper — checks today's date in Manila time. */
const getFullRemittanceToday = (
    supplierCode: number,
    eventId: number,
): Promise<FullRemittanceTodayRow | null> => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    return getFullRemittanceByDate(supplierCode, eventId, today);
};

export interface TransactionRow {
    id: number;
    receipt_no: string;
    reference_code: string;
    supplier_id: number;
    status: number;
}

/**
 * Fetches a single transaction by its primary key, including the formatted receipt_no.
 * Returns null if not found.
 */
const getTransactionById = async (id: number): Promise<TransactionRow | null> => {
    const sql = `
        SELECT
            t.id,
            CONCAT(COALESCE(sr.prefix, ''), LPAD(t.transaction_no, COALESCE(sr.pad_length, 6), '0')) AS receipt_no,
            t.reference_code,
            t.supplier_id,
            t.status
        FROM tbl_transactions t
        LEFT JOIN tbl_series sr ON sr.code = CONCAT('TRX-', t.event_id)
        WHERE t.id = ?
        LIMIT 1
    `;
    const rows = await PoolManager.query<TransactionRow[]>(sql, [id]);
    return rows?.[0] ?? null;
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
    getPartialTotalsByDate,
    hasPrevSalesTransactionByDate,
    getFullRemittanceByDate,
    getFullRemittanceToday,
    getTransactionById,
    updateTransactionStatus,
};
