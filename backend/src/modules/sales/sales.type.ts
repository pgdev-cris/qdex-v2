interface SalesRecord {
    payment_method: string;
    total: string;
}

interface SalesApiResponse {
    result: string;
    data: SalesRecord[];
    vendor_name?: string;
    message?: string;
}
