import PoolManager from '../../shared/db/pool.manager';

export interface TenderTypeRow {
    id: number;
    code: string;
    label: string;
    is_editable: number; // 0 | 1 (BIT/TINYINT)
    allow_partial_remit: number; // 0 | 1 — whether this tender appears in partial remittance
    sort: number;
}

const getAll = async (): Promise<TenderTypeRow[]> => {
    const sql = `
        SELECT
            id,
            code,
            label,
            CAST(is_editable AS UNSIGNED) AS is_editable,
            CAST(allow_partial_remit AS UNSIGNED) AS allow_partial_remit,
            sort
        FROM tbl_tender_types
        ORDER BY sort ASC, id ASC
    `;
    return PoolManager.query<TenderTypeRow[]>(sql, []);
};

export default { getAll };
