import supplierProvider from '../../shared/providers/supplier.provider';
import eventProvider from '../../shared/providers/event.provider';
import remittanceRepository from '../remittance/remittance.repository';
import { ConflictError } from '../../shared/errors';

const baseUrl = process.env.SALES_API_URL ?? 'http://192.168.110.90:4003/qdex';

const manilaDate = (d: Date): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d);

/**
 * Guards against duplicate full remittances.
 * Throws ConflictError if a non-voided full remittance already exists today for this supplier.
 */
const assertNoFullRemittanceToday = async (supplierCode: number): Promise<void> => {
    const event = await eventProvider.getCurrentEvent();
    const existing = await remittanceRepository.getFullRemittanceToday(supplierCode, event.id);
    if (existing) {
        throw new ConflictError(
            `Vendor already fully remitted today. Reference No.: ${existing.reference_code} (${existing.receipt_no})`,
        );
    }
};

/**
 * Fetches previous-day unremitted sales for a supplier, with partial remittances deducted.
 * Returns null if the vendor already had a full remittance yesterday, if the POS call fails,
 * or if all tenders are fully covered by yesterday's partial remittances.
 *
 * The returned `sales` are net amounts (POS total minus partial already remitted).
 * The `partial_deductions` map shows how much was deducted per tender code.
 */
const getPrevDaySales = async (
    supplierCode: number,
    eventId: number,
): Promise<{
    sales: SalesRecord[];
    date: string;
    partial_deductions: Record<string, number>;
} | null> => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = manilaDate(yesterday);

    const existing = await remittanceRepository.getFullRemittanceByDate(
        supplierCode,
        eventId,
        yesterdayStr,
    );
    if (existing) return null; // already fully remitted yesterday — nothing to show

    // If any transaction today already absorbed prev-day sales, nothing left to show
    const todayStr = manilaDate(new Date());
    const prevAlreadyCaptured = await remittanceRepository.hasPrevSalesTransactionByDate(
        supplierCode,
        eventId,
        todayStr,
    );
    if (prevAlreadyCaptured) return null;

    // Fetch partial remittances already done yesterday (real DB, even in mock mode)
    const partialDeductions = await remittanceRepository.getPartialTotalsByDate(
        supplierCode,
        eventId,
        yesterdayStr,
    );

    let rawSales: SalesRecord[];

    if (process.env.POS_MOCK === 'true') {
        rawSales = [
            { payment_method: 'CASH', total: '3200.00', total_count: 5 },
            { payment_method: 'GCASH', total: '800.00', total_count: 2 },
            { payment_method: 'PWALLET', total: '600.00', total_count: 1 },
            { payment_method: 'TANGENT_DEBIT', total: '600.00', total_count: 1 },
            { payment_method: 'TANGENT_CREDIT', total: '1500.00', total_count: 1 },
        ] as SalesRecord[];
    } else {
        try {
            const url = `${baseUrl}/fetch-sales/${encodeURIComponent(supplierCode)}?date=${yesterdayStr}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5_000),
            });
            if (!response.ok) return null;
            const json = (await response.json()) as SalesApiResponse;
            rawSales = json.data ?? [];
            if (rawSales.length === 0) return null;
        } catch {
            return null; // non-fatal — don't block today's remittance
        }
    }

    // Deduct partial remittances from each tender; drop tenders fully covered
    const netSales = rawSales
        .map((s) => {
            const deducted = partialDeductions[s.payment_method] ?? 0;
            const net = parseFloat(Math.max(0, parseFloat(s.total) - deducted).toFixed(2));
            return { ...s, total: String(net) };
        })
        .filter((s) => parseFloat(s.total) > 0);

    if (netSales.length === 0) return null; // everything already partially remitted

    return { sales: netSales, date: yesterdayStr, partial_deductions: partialDeductions };
};

const getSupplierSales = async (supplierCode: number) => {
    const supplier = await supplierProvider.validateSupplier(supplierCode);
    const event = await eventProvider.getCurrentEvent();

    await assertNoFullRemittanceToday(supplierCode);

    const url = `${baseUrl}/fetch-sales/${encodeURIComponent(supplierCode)}`;

    let response: Response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10_000),
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not reach the sales service.';
        throw new Error(`[POS] ${message}`);
    }

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(
            `[POS] ${errorBody?.message ?? `HTTP error! status: ${response.statusText}`}`,
        );
    }

    const json = (await response.json()) as SalesApiResponse;
    const prevDay = await getPrevDaySales(supplierCode, event.id);

    return {
        supplier,
        sales: json.data,
        total_amount: getSupplierSalesTotalAmount(json.data),
        prev_sales: prevDay?.sales ?? null,
        prev_date: prevDay?.date ?? null,
        prev_partial_deductions: prevDay?.partial_deductions ?? null,
    };
};

const getSupplierSalesMock = async (supplierCode: number) => {
    const supplier = await supplierProvider.validateSupplier(supplierCode);
    const event = await eventProvider.getCurrentEvent();

    await assertNoFullRemittanceToday(supplierCode);

    const supplierSales = [
        { payment_method: 'CASH', total: '6055.39', total_count: 2 },
        { payment_method: 'GCASH', total: '1000.00', total_count: 3 },
        { payment_method: 'PWALLET', total: '1000.00', total_count: 5 },
        { payment_method: 'TANGENT_DEBIT', total: '1000.00', total_count: 4 },
        { payment_method: 'SKYRO', total: '600.00', total_count: 2 },
    ] as SalesRecord[];

    const prevDay = await getPrevDaySales(supplierCode, event.id);

    return {
        supplier,
        sales: supplierSales,
        total_amount: getSupplierSalesTotalAmount(supplierSales),
        prev_sales: prevDay?.sales ?? null,
        prev_date: prevDay?.date ?? null,
        prev_partial_deductions: prevDay?.partial_deductions ?? null,
    };
};

const getSupplierSalesTotalAmount = (sales: SalesRecord[]): string => {
    const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
    return parseFloat(totalAmount.toFixed(2)).toString();
};

export default { getSupplierSales, getSupplierSalesMock };
