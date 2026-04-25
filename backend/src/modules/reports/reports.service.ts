import repository from './reports.repository';
import {
    RemittanceReportQuery,
    TransactionReportQuery,
    RemittanceStatusQuery,
} from './reports.schema';
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
    ref_code: string;
    verified_by: string;
    verified_date: string;
    transaction_no: string;
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

    // Key: transaction_id — one pivoted row per transaction
    const map = new Map<number, PivotedSupplierRow>();

    for (const row of rawRows) {
        const key = row.transaction_id;

        if (!map.has(key)) {
            map.set(key, {
                supplier_code: row.supplier_code,
                supplier_name: row.supplier_name,
                ref_code: row.reference_code,
                verified_by: row.verified_by ?? '',
                verified_date: row.verified_at ?? '',
                transaction_no: row.transaction_no,
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

// ─── Mock POS data ────────────────────────────────────────────────────────────
// Set POS_MOCK=true in your .env to generate deterministic dummy sales data
// when the cloud POS API is unreachable (e.g. working off-network).

const POS_MOCK = process.env.POS_MOCK === 'true';

/**
 * Generates stable dummy POS sales for each supplier based on their code + date.
 * The values are deterministic so the same inputs always produce the same amounts,
 * making it easy to spot regressions during offline development.
 */
const generateMockPosSales = (
    supplierCodes: number[],
    date: string,
): SalesPerVendorByDate[] => {
    const dateSeed = parseInt(date.replace(/-/g, ''), 10) || 20240101;
    return supplierCodes.map((code) => {
        // Simple but stable pseudo-random from code + date
        const seed = ((code * 6364136223846793005 + dateSeed) >>> 0) % 100_000;
        const total = Math.round((seed % 90_000) + 10_000); // ₱10,000 – ₱100,000
        const gcash = Math.round(total * 0.30);
        const creditCard = Math.round(total * 0.10);
        const cash = total - gcash - creditCard;
        return {
            vendor_code: code,
            cash: String(cash),
            gcash: String(gcash),
            pwallet: '0',
            credit_card: String(creditCard),
            home_credit: '0',
            total_revenue: String(total),
        };
    });
};

export type RemittanceStatus = 'settled' | 'partial' | 'pending' | 'no_activity';

export interface RemittanceStatusResult {
    supplier_id: number;
    supplier_code: number;
    supplier_name: string;
    total_sales: number; // sourced from POS total_revenue
    total_remitted: number; // sourced from DB verified transactions
    balance: number; // total_sales - total_remitted
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
 * - no_activity : no POS sales AND no remittance recorded
 * - pending     : has POS sales but nothing remitted yet
 * - settled     : remitted >= POS sales (balance <= 0)
 * - partial     : has remitted something but balance is still > 0,
 *                 OR remitted but POS sales unavailable (possible POS error)
 */
const deriveStatus = (totalSales: number, totalRemitted: number): RemittanceStatus => {
    if (totalSales === 0 && totalRemitted === 0) return 'no_activity';
    if (totalSales === 0 && totalRemitted > 0) return 'partial';
    if (totalRemitted === 0) return 'pending';
    if (totalSales - totalRemitted <= 0) return 'settled';
    return 'partial';
};

const getRemittanceStatusReport = async (
    query: RemittanceStatusQuery,
): Promise<RemittanceStatusReport> => {
    // Use `from` date for POS lookup; fall back to today if not provided
    const posDate = query.from ?? format(new Date(), 'yyyy-MM-dd');

    // Fetch DB rows first; POS data depends on mock flag or live API
    const dbRows = await repository.getRemittanceStatus(query);

    let posData: SalesPerVendorByDate[];
    if (POS_MOCK) {
        // Offline / dev mode — generate deterministic dummy sales per supplier
        const supplierCodes = dbRows.map((r) => r.supplier_code);
        posData = generateMockPosSales(supplierCodes, posDate);
    } else {
        const posResponse = await posClient
            .getSalesPerVendorByDate(posDate)
            .catch(() => ({ data: [] as SalesPerVendorByDate[] }));
        posData = posResponse.data ?? [];
    }

    // Build a vendor_code → POS data map for O(1) lookups
    const posMap = new Map<number, SalesPerVendorByDate>();
    for (const vendor of posData) {
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
