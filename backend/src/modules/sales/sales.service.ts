import supplierProvider from '../../shared/providers/supplier.provider';

const getSupplierSales = async (supplierCode: number) => {
    const supplier = await supplierProvider.validateSupplier(supplierCode);

    const baseUrl = process.env.SALES_API_URL ?? 'http://192.168.110.90:4003/qdex';
    const url = `${baseUrl}/fetch-sales/${encodeURIComponent(supplierCode)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10_000),
        });

        const json: SalesApiResponse = (await response.json()) as SalesApiResponse;

        console.log(json);

        return {
            supplier: supplier,
            sales: json.data,
            total_amount: getSupplierSalesTotalAmount(json.data),
        };
    } catch (err: unknown) {
        console.error('Error fetching sales:', err);

        const message = err instanceof Error ? err.message : 'Could not reach the sales service.';

        throw new Error(message);
    }
};

const getSupplierSalesMock = async (supplierCode: number) => {
    const supplier = await supplierProvider.validateSupplier(supplierCode);

    const supplierSales = [
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
    ] as SalesRecord[];

    return {
        supplier: supplier,
        sales: supplierSales,
        total_amount: getSupplierSalesTotalAmount(supplierSales),
    };
};

const getSupplierSalesTotalAmount = (sales: SalesRecord[]): string => {
    const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
    return parseFloat(totalAmount.toFixed(2)).toString();
};

export default { getSupplierSales, getSupplierSalesMock };
