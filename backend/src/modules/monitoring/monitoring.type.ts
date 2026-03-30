export interface TransactionRow {
    id: number;
    receipt_no: string;
    reference_code: string;
    vendor_code: number;
    vendor_name: string;
    event_name: string;
    event_code: string;
    type: number;
    remit_type: number;
    status: number;
    total_amount: number;
    remitted_by: string;
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
    search?: string;
    type?: number;
    status?: number;
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
