const getVendorSales = async (vendorCode: string) => {
    const baseUrl = process.env.SALES_API_URL ?? 'http://192.168.110.90:4003/qdex';
    const url = `${baseUrl}/fetch-sales/${encodeURIComponent(vendorCode)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10_000),
        });

        const json: SalesApiResponse = (await response.json()) as SalesApiResponse;

        return json.data;
    } catch (err: unknown) {
        console.error('Error fetching sales:', err);

        const message = err instanceof Error ? err.message : 'Could not reach the sales service.';

        throw new Error(message);
    }
};

const getVendorSalesMock = async (vendorCode: number) => {
    return [
        {
            payment_method: 'CASH',
            total: '6055.37',
            total_count: 2,
        },
        {
            payment_method: 'GCASH',
            total: '1000.00',
            total_count: 3,
        },
        {
            payment_method: 'PWALLET',
            total: '1000.00',
            total_count: 5,
        },
        {
            payment_method: 'CREDIT_CARD',
            total: '1000.00',
            total_count: 4,
        },
    ];
};

export default { getVendorSales, getVendorSalesMock };
