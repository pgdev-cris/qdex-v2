import { PoolConnection } from 'mysql2/promise';
import PoolManager from '../db/pool.manager';

export interface SeriesRow {
    code: string;
    prefix: string | null;
    last_sequence: number;
    pad_length: number;
}

// Read series row (plain query, no lock)
const findByCode = async (code: string): Promise<SeriesRow | null> => {
    const query = `
        SELECT code, prefix, last_sequence, pad_length
        FROM tbl_series
        WHERE code = ?
        LIMIT 1
    `;
    const rows = await PoolManager.query<SeriesRow[]>(query, [code]);
    return rows?.[0] ?? null;
};

// Atomic increment inside a caller-supplied connection (FOR UPDATE lock)
const incrementWithConnection = async (
    code: string,
    conn: PoolConnection,
): Promise<SeriesRow | null> => {
    // Lock the row for this transaction
    const [selectRows] = await conn.execute(
        `SELECT code, prefix, last_sequence, pad_length
         FROM tbl_series
         WHERE code = ?
         LIMIT 1
         FOR UPDATE`,
        [code],
    );

    const row = (selectRows as SeriesRow[])[0] ?? null;
    if (!row) return null;

    const next = row.last_sequence + 1;

    await conn.execute(
        `UPDATE tbl_series
         SET last_sequence = ?, updated_at = NOW()
         WHERE code = ?`,
        [next, code],
    );

    return { ...row, last_sequence: next };
};

// Create a fresh series counter row for a newly created event
const createSeriesForEvent = async (
    eventId: number,
    padLength: number = 6,
    prefix: string | null = null,
): Promise<void> => {
    const code = `TRX-${eventId}`;
    await PoolManager.execute(
        `INSERT INTO tbl_series (code, prefix, last_sequence, pad_length)
         VALUES (?, ?, 0, ?)`,
        [code, prefix, padLength],
    );
};

export default { findByCode, incrementWithConnection, createSeriesForEvent };
