import repository from './reports.repository';
import { RemittanceReportQuery, TransactionReportQuery, RemittanceStatusQuery } from './reports.schema';
import { RemittanceStatusRow } from './reports.repository';

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

export interface RemittanceStatusResult extends RemittanceStatusRow {
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

const deriveStatus = (row: RemittanceStatusRow): RemittanceStatus => {
    const { total_sales, total_remitted, transaction_count } = row;
    if (transaction_count === 0) return 'no_activity';
    if (total_remitted > 0 && Number(total_sales) === 0) return 'partial'; // only partials, no full remit yet
    if (Number(total_sales) > 0 && total_remitted === 0) return 'pending';
    if (Number(total_sales) > 0 && Number(total_sales) - Number(total_remitted) <= 0) return 'settled';
    return 'partial';
};

const getRemittanceStatusReport = async (
    query: RemittanceStatusQuery,
): Promise<RemittanceStatusReport> => {
    const rows = await repository.getRemittanceStatus(query);

    const results: RemittanceStatusResult[] = rows.map((r) => ({
        ...r,
        status: deriveStatus(r),
    }));

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
