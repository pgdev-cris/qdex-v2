import repository from './reports.repository';
import { RemittanceReportQuery, TransactionReportQuery, RemittanceStatusQuery } from './reports.schema';
import { RemittanceStatusRow } from './reports.repository';
import posClient from '../../shared/clients/pos.client';
import { SalesPerVendorByDate } from '../../shared/types/pos.type';
import { format } from 'date-fns';

const getRemittanceReport = async (query: RemittanceReportQuery) => {
    const [transactions, summary] = await Promise.all([
        repository.getRemittances(query),
        repository.getRemittanceSummary(query),
    ]);
    return { summary, transactions };
};

const getRemittanceSummary = async (query: RemittanceReportQuery) => {
    return await repository.getRemittanceSummary(query);
};

const getRemittanceById = async (id: number) => {
    return await repository.getRemittanceById(id);
};

const getTransactionReport = async (query: TransactionReportQuery) => {
    return await repository.getTransactions(query);
};

export interface PivotedSupplierRow {
    supplier_code: number;
    supplier_name: string;
    event_code: string;
    event_name: string;
    tenders: Record<string, number>; // tender_name → total
    grand_total: number;
}

export interface SupplierPerTenderReport {
    tender_names: string[]; // ordered by tender_type_id
    rows: PivotedSupplierRow[];
}

const getSupplierPerTenderReport = async (
    query: TransactionReportQuery,
): Promise<SupplierPerTenderReport> => {
    const rawRows = await repository.getSupplierPerTender(query);

    // Track tender name order (SQL is ordered by tt.id ASC so insertion order is correct)
    const tenderOrder: string[] = [];
    const seenTenders = new Set<string>();

    // Key: "event_code||supplier_code"
    const map = new Map<string, PivotedSupplierRow>();

    for (const row of rawRows) {
        const key = `${row.event_code}||${row.supplier_code}`;

        if (!map.has(key)) {
            map.set(key, {
                supplier_code: row.supplier_code,
                supplier_name: row.supplier_name,
                event_code: row.event_code,
                event_name: row.event_name,
                tenders: {},
                grand_total: 0,
            });
        }

        const entry = map.get(key)!;
        const amount = Number(row.total);
        entry.tenders[row.tender_name] = amount;
        entry.grand_total += amount;

        if (!seenTenders.has(row.tender_name)) {
            seenTenders.add(row.tender_name);
            tenderOrder.push(row.tender_name);
        }
    }

    return {
        tender_names: tenderOrder,
        rows: [...map.values()],
    };
};

export type RemittanceStatus = 'settled' | 'partial' | 'pending' | 'no_activity';

export interface RemittanceStatusResult {
    supplier_id: number;
    supplier_code: number;
    supplier_name: string;
    total_sales: number;    // sourced from POS total_revenue
    total_remitted: number; // sourced from DB verified transactions
    balance: number;        // total_sales - total_remitted
    transaction_count: number;
    status: RemittanceStatus;
}

export interface RemittanceStatusSummary {
    total_suppliers: number;
    settled: number;
    partial: number;
    pending: number;
    no_activity: number;
}

export interface RemittanceStatusReport {
    rows: RemittanceStatusResult[];
    summary: RemittanceStatusSummary;
}

/**
 * Derive remittance status from POS sales vs DB remitted amounts.
 * - no_activity : vendor has no POS sales for the day
 * - pending     : vendor has POS sales but has not remitted anything
 * - settled     : vendor remitted >= POS sales (balance <= 0)
 * - partial     : vendor has remitted something but balance is still > 0
 */
const deriveStatus = (totalSales: number, totalRemitted: number): RemittanceStatus => {
    if (totalSales === 0) return 'no_activity';
    if (totalRemitted === 0) return 'pending';
    if (totalSales - totalRemitted <= 0) return 'settled';
    return 'partial';
};

const getRemittanceStatusReport = async (
    query: RemittanceStatusQuery,
): Promise<RemittanceStatusReport> => {
    // Use `from` date for POS lookup; fall back to today if not provided
    const posDate = query.from ?? format(new Date(), 'yyyy-MM-dd');

    // Fetch POS sales and DB remittance totals in parallel
    const [posResponse, dbRows] = await Promise.all([
        posClient.getSalesPerVendorByDate(posDate).catch(() => ({ data: [] as SalesPerVendorByDate[] })),
        repository.getRemittanceStatus(query),
    ]);

    // Build a vendor_code → POS data map for O(1) lookups
    const posMap = new Map<number, SalesPerVendorByDate>();
    for (const vendor of (posResponse.data ?? [])) {
        posMap.set(vendor.vendor_code, vendor);
    }

    const results: RemittanceStatusResult[] = dbRows.map((r) => {
        const posData = posMap.get(r.supplier_code);
        const total_sales = posData ? Number(posData.total_revenue) : 0;
        const total_remitted = Number(r.total_remitted);
        const balance = total_sales - total_remitted;

        return {
            supplier_id: r.supplier_id,
            supplier_code: r.supplier_code,
            supplier_name: r.supplier_name,
            total_sales,
            total_remitted,
            balance,
            transaction_count: r.transaction_count,
            status: deriveStatus(total_sales, total_remitted),
        };
    });

    const summary: RemittanceStatusSummary = {
        total_suppliers: results.length,
        settled: results.filter((r) => r.status === 'settled').length,
        partial: results.filter((r) => r.status === 'partial').length,
        pending: results.filter((r) => r.status === 'pending').length,
        no_activity: results.filter((r) => r.status === 'no_activity').length,
    };

    return { rows: results, summary };
};

export default {
    getRemittanceReport,
    getRemittanceSummary,
    getRemittanceById,
    getTransactionReport,
    getSupplierPerTenderReport,
    getRemittanceStatusReport,
};
