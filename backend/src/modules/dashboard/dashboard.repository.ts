import { TRANSACTION_STATUS } from '../../shared/constants/app.constants';
import PoolManager from '../../shared/db/pool.manager';

export interface DashboardStats {
    total_sales_today: number;
    total_remittances_today: number;
    sales_by_tender: { tender_type: string; label: string; amount: number }[];
    remittances_per_hour: { hour: number; count: number }[];
}

const getDashboardStats = async (eventId: number): Promise<DashboardStats> => {
    // 1. Total sales amount (today) - filtered by current event
    const salesTodaySql = `
        SELECT SUM(total_amount) as total
        FROM tbl_transactions
        WHERE status = ${TRANSACTION_STATUS.VERIFIED}
          AND event_id = ?
          AND DATE(transacted_at) = CURDATE()
    `;
    const salesTodayRows = await PoolManager.query<{ total: number | null }[]>(salesTodaySql, [eventId]);
    const total_sales_today = Number(salesTodayRows[0]?.total ?? 0);

    // 2. Total remittances count (today) - filtered by current event
    const countTodaySql = `
        SELECT COUNT(*) as count
        FROM tbl_transactions
        WHERE status = ${TRANSACTION_STATUS.VERIFIED}
          AND event_id = ?
          AND DATE(transacted_at) = CURDATE()
    `;
    const countTodayRows = await PoolManager.query<{ count: number }[]>(countTodaySql, [eventId]);
    const total_remittances_today = countTodayRows[0]?.count ?? 0;

    // 3. Sales by tender type - filtered by current event, use tbl_tender_types label
    const salesByTenderSql = `
        SELECT
            td.tender_type,
            COALESCE(tt.label, CONCAT('Tender ', td.tender_type)) AS label,
            SUM(td.amount) AS amount
        FROM tbl_transaction_details td
        JOIN tbl_transactions t ON t.id = td.transaction_id
        LEFT JOIN tbl_tender_types tt ON tt.id = td.tender_type
        WHERE t.status = ${TRANSACTION_STATUS.VERIFIED}
          AND t.event_id = ?
        GROUP BY td.tender_type, tt.label
        ORDER BY td.tender_type ASC
    `;
    const salesByTenderRows = await PoolManager.query<{
        tender_type: number;
        label: string;
        amount: number;
    }[]>(salesByTenderSql, [eventId]);

    // Map numeric tender_type to string key for chart color lookup
    const sales_by_tender = salesByTenderRows.map((row) => ({
        tender_type: `TENDER_${row.tender_type}`,
        label: row.label,
        amount: Number(row.amount),
    }));

    // 4. Remittances per hour (today) - filtered by current event
    const remittancesPerHourSql = `
        SELECT HOUR(transacted_at) as hour, COUNT(*) as count
        FROM tbl_transactions
        WHERE status = ${TRANSACTION_STATUS.VERIFIED}
          AND event_id = ?
          AND DATE(transacted_at) = CURDATE()
        GROUP BY HOUR(transacted_at)
        ORDER BY hour ASC
    `;
    const remittancesPerHourRows = await PoolManager.query<{ hour: number; count: number }[]>(
        remittancesPerHourSql,
        [eventId],
    );

    // Fill in all 24 hours if missing
    const hourlyDataMap = new Map(remittancesPerHourRows.map((r) => [r.hour, r.count]));
    const remittances_per_hour = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourlyDataMap.get(i) ?? 0,
    }));

    return {
        total_sales_today,
        total_remittances_today,
        sales_by_tender,
        remittances_per_hour,
    };
};

export default { getDashboardStats };
