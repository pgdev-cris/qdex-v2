export interface RemitLine {
    method: string;
    amount: string | number;
}

export interface PartialRemitPayload {
    vendor_code: string;
    remitter_name: string;
    lines: RemitLine[];
}

export interface FullRemitPayload {
    vendor_code: string;
    remitter_name: string;
    lines: RemitLine[];
}

export interface RemitResult {
    receipt_no: string;
    reference_code: string;
    vendor_code: string;
    vendor_name: string;
    remitter_name: string;
    remit_type: 'partial' | 'full';
    lines: RemitLine[];
    remitted_at: string;
}
