export interface SalesRecord {
    payment_method: string
    total: string
    total_count: number
}

export interface SupplierInfo {
    name: string
    code: number
}

export interface SalesData {
    supplier: SupplierInfo
    sales: SalesRecord[]
    total_amount: number
}

export interface SalesResponse {
    result: string
    message: string
    status: number
    data: SalesData
}
export interface ReceiptLine {
    method: string
    amount: string
}

export interface Receipt {
    trans_no: string
    ref_code: string
    supplier_code: string
    supplier_name: string
    remitter_name: string
    remit_type: 'partial' | 'full'
    lines: ReceiptLine[]
    verified_at: string
    gen_at: string
    printed_by: string
    event_name: string
    event_code: string
}

//  Remittance API

export interface RemittanceApiData {
    receipt_no: string
    reference_code: string
    supplier_code: string
    supplier_name: string
    remitter_name: string
    remit_type: string
    lines: ReceiptLine[]
    remitted_at: string
}

export interface RemittanceApiResponse {
    result: 'success' | 'error'
    message: string
    data?: RemittanceApiData
}

export type Step = 'search' | 'select-type' | 'remit' | 'receipt'
export type RemitType = 'partial' | 'full'
