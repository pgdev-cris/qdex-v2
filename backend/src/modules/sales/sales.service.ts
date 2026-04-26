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
 * Fetches previous-day unremitted sales for a supplier.
 * Returns null if the vendor already had a full remittance yesterday or if the POS call fails.
 */
const getPrevDaySales = async (
    supplierCode: number,
    eventId: number,
): Promise<{ sales: SalesRecord[]; date: string } | null> => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = manilaDate(yesterday);

    const existing = await remittanceRepository.getFullRemittanceByDate(
        supplierCode,
        eventId,
        yesterdayStr,
    );
    if (existing) return null; // already remitted yesterday — nothing to show

    if (process.env.POS_MOCK === 'true') {
        return {
            date: yesterdayStr,
            sales: [
                { payment_method: 'CASH', total: '3200.00', total_count: 5 },
                { payment_method: 'GCASH', total: '800.00', total_count: 2 },
                { payment_method: 'PWALLET', total: '600.00', total_count: 1 },
                { payment_method: 'TANGENT_DEBIT', total: '500.00', total_count: 1 },
                { payment_method: 'TANGENT_CREDIT', total: '1500.00', total_count: 1 },
            ] as SalesRecord[],
        };
    }

    try {
        const url = `${baseUrl}/fetch-sales/${encodeURIComponent(supplierCode)}?date=${yesterdayStr}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) return null;
        const json = (await response.json()) as SalesApiResponse;
        const sales = json.data ?? [];
        if (sales.length === 0) return null;
        return { sales, date: yesterdayStr };
    } catch {
        return null; // non-fatal — don't block today's remittance
    }
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
    ] as SalesRecord[];

    const prevDay = await getPrevDaySales(supplierCode, event.id);

    return {
        supplier,
        sales: supplierSales,
        total_amount: getSupplierSalesTotalAmount(supplierSales),
        prev_sales: prevDay?.sales ?? null,
        prev_date: prevDay?.date ?? null,
    };
};

const getSupplierSalesTotalAmount = (sales: SalesRecord[]): string => {
    const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
    return parseFloat(totalAmount.toFixed(2)).toString();
};

export default { getSupplierSales, getSupplierSalesMock };
