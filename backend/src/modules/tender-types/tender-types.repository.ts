import PoolManager from '../../shared/db/pool.manager';

export interface TenderTypeRow {
    id: number;
    code: string;
    label: string;
    is_editable: number; // 0 | 1 (BIT/TINYINT)
    is_partiable: number; // 0 | 1 — whether this tender appears in partial remittance
    sort: number;
}

const getAll = async (): Promise<TenderTypeRow[]> => {
    const sql = `
        SELECT
            id,
            code,
            label,
            CAST(is_editable AS UNSIGNED) AS is_editable,
            CAST(is_partiable AS UNSIGNED) AS is_partiable,
            sort
        FROM tbl_tender_types
        ORDER BY sort ASC, id ASC
    `;
    return PoolManager.query<TenderTypeRow[]>(sql, []);
};

export default { getAll };
