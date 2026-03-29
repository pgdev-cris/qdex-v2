import vendorRepository from '../../shared/repository/vendor.repository';
import { VENDOR_STATUS } from '../../shared/constants';
import { ConflictError, NotFoundError } from '../../shared/errors';

const getVendorSales = async (vendorCode: number) => {
    await validateVendorCode(vendorCode);

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

const validateVendorCode = async (vendorCode: number) => {
    const vendor = await vendorRepository.getVendorByCode(vendorCode);
    if (!vendor) {
        throw new NotFoundError(
            'Vendor not found or invalid code. Please check the vendor code and try again.',
        );
    }

    if (vendor.status !== VENDOR_STATUS.ACTIVE) {
        throw new ConflictError('Vendor is not active.');
    }

    return vendor;
};

const getVendorSalesMock = async (vendorCode: number) => {
    await validateVendorCode(vendorCode);

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
