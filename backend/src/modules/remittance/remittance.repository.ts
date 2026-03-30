import { PoolConnection } from 'mysql2/promise';

//  Types 

export interface InsertTransactionData {
    event_id: number;
    vendor_id: number;
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
            (event_id, vendor_id, transaction_no, transacted_at, total_amount, reference_code,
             remitted_by, verified_by, verified_at, status, type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.event_id,
            data.vendor_id,
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

export default { createTransaction, createTransactionDetails };
