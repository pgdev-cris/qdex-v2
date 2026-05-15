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

    // Fetch partial remittances already done yesterday (real DB, even in mock mode)
    const partialDeductions = await remittanceRepository.getPartialTotalsByDate(
        supplierCode,
        eventId,
        yesterdayStr,
    );

    // Fetch prev-day amounts already captured in today's remittances (is_prev_sales = 1 lines).
    // This replaces the old boolean hasPrevSalesTransactionByDate check — that approach blocked
    // ALL prev-day sales once any tender was remitted, causing unremitted tenders (e.g. Cash)
    // to silently disappear on the next remittance.
    const todayStr = manilaDate(new Date());
    const todayPrevRemitted = await remittanceRepository.getPrevSalesRemittedByDate(
        supplierCode,
        eventId,
        todayStr,
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

    // Deduct: (1) partial remittances done yesterday, (2) prev-day portions already remitted today
    const netSales = rawSales
        .map((s) => {
            const yesterdayDeducted = partialDeductions[s.payment_method] ?? 0;
            const todayDeducted = todayPrevRemitted[s.payment_method] ?? 0;
            const net = parseFloat(
                Math.max(0, parseFloat(s.total) - yesterdayDeducted - todayDeducted).toFixed(2),
            );
            return { ...s, total: String(net) };
        })
        .filter((s) => parseFloat(s.total) > 0);

    if (netSales.length === 0) return null; // all prev-day amounts fully covered

    // Combine deductions for display on the frontend
    const allDeductions: Record<string, number> = { ...partialDeductions };
    for (const [method, amt] of Object.entries(todayPrevRemitted)) {
        allDeductions[method] = (allDeductions[method] ?? 0) + amt;
    }

    return { sales: netSales, date: yesterdayStr, partial_deductions: allDeductions };
};

const getSupplierSales = async (supplierCode: number) => {
    const supplier = await supplierProvider.validateSupplier(supplierCode);
    const event = await eventProvider.getCurrentEvent();

    await assertNoFullRemittanceToday(supplierCode);

    const url = `${baseUrl}/fetch-sales/${encodeURIComponent(supplierCode)}`;

    let currentSales: SalesRecord[] = [];
    let posError: Error | null = null;

    try {
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
        currentSales = json.data;
    } catch (err: unknown) {
        posError = err instanceof Error ? err : new Error(String(err));
    }

    const prevDay = await getPrevDaySales(supplierCode, event.id);

    // POS fetch failed — allow proceeding only if there are previous unremitted sales
    if (posError) {
        if (prevDay && prevDay.sales.length > 0) {
            return {
                supplier,
                sales: [] as SalesRecord[],
                total_amount: '0',
                prev_sales: prevDay.sales,
                prev_date: prevDay.date,
                prev_partial_deductions: prevDay.partial_deductions,
            };
        }
        // No previous sales to fall back on — surface the POS error
        throw posError;
    }

    return {
        supplier,
        sales: currentSales,
        total_amount: getSupplierSalesTotalAmount(currentSales),
        prev_sales: prevDay?.sales ?? null,
        prev_date: prevDay?.date ?? null,
        prev_partial_deductions: prevDay?.partial_deductions ?? null,
    };
};

const getSupplierSalesMock = async (supplierCode: number) => {
    const supplier = await supplierProvider.validateSupplier(supplierCode);
    const event = await eventProvider.getCurrentEvent();

    await assertNoFullRemittanceToday(supplierCode);

    // Simulate a POS failure — fall through to prev-sales check before surfacing the error
    const simulatePosFailure = true;
    if (simulatePosFailure) {
        const prevDay = await getPrevDaySales(supplierCode, event.id);
        if (prevDay && prevDay.sales.length > 0) {
            return {
                supplier,
                sales: [] as SalesRecord[],
                total_amount: '0',
                prev_sales: prevDay.sales,
                prev_date: prevDay.date,
                prev_partial_deductions: prevDay.partial_deductions,
            };
        }
        throw new Error('Mock no sales error on back end.');
    }

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
