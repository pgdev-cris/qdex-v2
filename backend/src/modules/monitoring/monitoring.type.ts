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
    is_overridden: number; // 0 | 1
}

export interface TransactionDetailRow {
    tender_type: number;
    amount: number;
    transaction_count: number;
}

export interface OverrideLogRow {
    id: number;
    action_id: number;
    action_code: string | null;
    action_label: string | null;
    requester_user_id: number;
    requester_name: string | null;
    approver_user_id: number;
    approver_name: string | null;
    remarks: string;
    created_at: string;
}

export interface TransactionWithDetails extends TransactionRow {
    details: TransactionDetailRow[];
    overrides: OverrideLogRow[];
}

export interface ListTransactionsQuery {
    event_id?: number;
    search?: string;
    type?: number;
    status?: number;
    date_from?: string; // YYYY-MM-DD
    date_to?: string; // YYYY-MM-DD
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
