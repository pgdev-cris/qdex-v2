export interface RemitLine {
    method: string;
    amount: string | number;
    /** True when this detail line amount came from the previous day's unremitted sales */
    is_prev_sales?: boolean;
}

export interface OverrideInfo {
    approver_user_id: number;
    remarks: string;
}

export interface PartialRemitPayload {
    supplier_code: string;
    remitter_name: string;
    lines: RemitLine[];
    override?: OverrideInfo;
    /** True when this remittance includes previous-day unremitted sales */
    has_prev_sales?: boolean;
}

export interface FullRemitPayload {
    supplier_code: string;
    remitter_name: string;
    lines: RemitLine[];
    override?: OverrideInfo;
    /** True when this remittance includes previous-day unremitted sales */
    has_prev_sales?: boolean;
}

export interface VoidPayload {
    override: OverrideInfo;
}

export interface Receipt {
    trans_no: string;
    ref_code: string;
    supplier_code: string;
    supplier_name: string;
    remitter_name: string;
    remit_type: 'partial' | 'full';
    lines: RemitLine[];
    verified_at: string;
    gen_at: string;
    printed_by: string;
    event_name: string;
    event_code: string;
    is_voided: boolean;
}

export interface RemitResult {
    receipt_no: string;
    reference_code: string;
    supplier_code: string;
    supplier_name: string;
    remitter_name: string;
    remit_type: 'partial' | 'full';
    lines: RemitLine[];
    remitted_at: string;
    /** True when every line in this remittance came from previous-day unremitted sales */
    is_prev_sales_only: boolean;
}
