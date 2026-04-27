import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../shared/constants';
import { ConflictError } from '../../shared/errors';
import service from './sales.service';

const fetchSalesRequest = async (req: Request, res: Response) => {
    const supplierCode = req.params.code ? parseInt(req.params.code as string, 10) : undefined;

    if (supplierCode !== undefined && isNaN(supplierCode)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            result: 'error',
            message: 'Invalid supplier code',
        });
    }

    if (!supplierCode) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            result: 'error',
            message: 'Supplier is required.',
        });
    }

    try {
        const supplierSales = process.env.POS_MOCK === 'true'
            ? await service.getSupplierSalesMock(supplierCode)
            : await service.getSupplierSales(supplierCode);

        return res.json({
            result: 'success',
            message: 'Sales fetched successfully',
            data: supplierSales,
        });
    } catch (err) {
        if (err instanceof ConflictError) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                result: 'already_remitted',
                message: err.message,
            });
        }
        throw err;
    }
};

export default { fetchSalesRequest };
