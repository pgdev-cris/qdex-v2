import { TENDER_TYPE, TRANSACTION_STATUS } from '../../shared/constants/app.constants';
import PoolManager from '../../shared/db/pool.manager';

export interface DashboardStats {
    total_sales_today: number;
    total_remittances_today: number;
    sales_by_tender: { tender_type: string; amount: number }[];
    remittances_per_hour: { hour: number; count: number }[];
}

const getDashboardStats = async (): Promise<DashboardStats> => {
    // 1. Total sales amount (today) - from tbl_transactions
    // Using TRANSACTION_STATUS.VERIFIED (1)
    const salesTodaySql = `
        SELECT SUM(total_amount) as total
        FROM tbl_transactions
        WHERE status = ${TRANSACTION_STATUS.VERIFIED} 
          AND DATE(transacted_at) = CURDATE()
    `;
    const salesTodayRows = await PoolManager.query<{ total: number | null }[]>(salesTodaySql);
    const total_sales_today = Number(salesTodayRows[0]?.total ?? 0);

    // 2. Total remittances count (today)
    const countTodaySql = `
        SELECT COUNT(*) as count
        FROM tbl_transactions
        WHERE status = ${TRANSACTION_STATUS.VERIFIED}
          AND DATE(transacted_at) = CURDATE()
    `;
    const countTodayRows = await PoolManager.query<{ count: number }[]>(countTodaySql);
    const total_remittances_today = countTodayRows[0]?.count ?? 0;

    // 3. Sales by tender type
    const salesByTenderSql = `
        SELECT td.tender_type, SUM(td.amount) as amount
        FROM tbl_transaction_details td
        JOIN tbl_transactions t ON t.id = td.transaction_id
        WHERE t.status = ${TRANSACTION_STATUS.VERIFIED}
        GROUP BY td.tender_type
    `;
    const salesByTenderRows =
        await PoolManager.query<{ tender_type: number; amount: number }[]>(salesByTenderSql);

    // Reverse map TENDER_TYPE constants
    const tenderMap: Record<number, string> = Object.entries(TENDER_TYPE).reduce(
        (acc, [name, id]) => {
            acc[id] = name;
            return acc;
        },
        {} as Record<number, string>,
    );

    const sales_by_tender = salesByTenderRows.map((row) => ({
        tender_type: tenderMap[row.tender_type] || `TENDER_${row.tender_type}`,
        amount: Number(row.amount),
    }));

    // 4. Remittances per hour (today)
    const remittancesPerHourSql = `
        SELECT HOUR(transacted_at) as hour, COUNT(*) as count
        FROM tbl_transactions
        WHERE status = ${TRANSACTION_STATUS.VERIFIED}
          AND DATE(transacted_at) = CURDATE()
        GROUP BY HOUR(transacted_at)
        ORDER BY hour ASC
    `;
    const remittancesPerHourRows =
        await PoolManager.query<{ hour: number; count: number }[]>(remittancesPerHourSql);

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
