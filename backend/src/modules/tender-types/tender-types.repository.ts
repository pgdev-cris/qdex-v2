import PoolManager from '../../shared/db/pool.manager';

export interface TenderTypeRow {
    id: number;
    code: string;
    label: string;
    is_editable: number; // 0 | 1 (BIT/TINYINT)
    sort: number;
}

const getAll = async (): Promise<TenderTypeRow[]> => {
    const sql = `
        SELECT
            id,
            code,
            label,
            CAST(is_editable AS UNSIGNED) AS is_editable,
            sort
        FROM tbl_tender_types
        ORDER BY sort ASC, id ASC
    `;
    return PoolManager.query<TenderTypeRow[]>(sql, []);
};

export default { getAll };
