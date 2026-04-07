import { SalesPerVendorByDateResponse } from '../types/pos.type';

const baseUrl = process.env.SALES_API_URL ?? 'http://192.168.110.90:4003/qdex';

const getSalesPerVendorByDate = async (date: string) => {
    const url = `${baseUrl}/tender-agregated?date=${encodeURIComponent(date)}`;

    let response: Response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not get the data from POS.';
        throw new Error(`[POS] ${message}`);
    }

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(
            `[POS] ${errorBody?.message ?? `HTTP error! status: ${response.statusText}`}`,
        );
    }

    return (await response.json()) as SalesPerVendorByDateResponse;
};

export default { getSalesPerVendorByDate };
