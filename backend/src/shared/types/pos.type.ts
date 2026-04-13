export interface SalesPerVendorByDateResponse {
    result: string;
    message: string;
    status: number;
    data: SalesPerVendorByDate[];
}

export interface SalesPerVendorByDate {
    vendor_code: number;
    cash: string;
    gcash: string;
    pwallet: string;
    credit_card: string;
    home_credit: string;
    total_revenue: string;
}
