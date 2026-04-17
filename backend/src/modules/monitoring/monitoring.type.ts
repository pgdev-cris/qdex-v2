export interface TransactionRow {
    id: number;
    receipt_no: string;
    reference_code: string;
    supplier_code: number;
    supplier_name: string;
    event_name: string;
    event_code: string;
    type: number;
    remit_type: number;
    status: number;
    total_amount: number;
    remitted_by: string;
    verified_by: string | null;
    transacted_at: string;
}

export interface TransactionDetailRow {
    tender_type: number;
    amount: number;
    transaction_count: number;
}

export interface TransactionWithDetails extends TransactionRow {
    details: TransactionDetailRow[];
}

export interface ListTransactionsQuery {
    event_id?: number;
    search?: string;
    type?: number;
    status?: number;
    date_from?: string; // YYYY-MM-DD
    date_to?: string;   // YYYY-MM-DD
    page?: number;
    limit?: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}
