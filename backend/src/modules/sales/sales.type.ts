interface SalesRecord {
    payment_method: string;
    total: string;
    total_count: number;
}

interface SalesApiResponse {
    result: string;
    data: SalesRecord[];
    supplier_name?: string;
    message?: string;
}
