import supplierProvider from '../../shared/providers/supplier.provider';

const baseUrl = process.env.SALES_API_URL ?? 'http://192.168.110.90:4003/qdex';

const getSupplierSales = async (supplierCode: number) => {
    const supplier = await supplierProvider.validateSupplier(supplierCode);

    const url = `${baseUrl}/fetch-sales/${encodeURIComponent(supplierCode)}`;

    let response: Response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10_000),
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not reach the sales service.';
        throw new Error(`[POS] ${message}`);
    }

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(
            `[POS] ${errorBody?.message ?? `HTTP error! status: ${response.statusText}`}`,
        );
    }

    const json = (await response.json()) as SalesApiResponse;

    return {
        supplier,
        sales: json.data,
        total_amount: getSupplierSalesTotalAmount(json.data),
    };
};

const getSupplierSalesMock = async (supplierCode: number) => {
    const supplier = await supplierProvider.validateSupplier(supplierCode);

    const supplierSales = [
        {
            payment_method: 'CASH',
            total: '6055.39',
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
