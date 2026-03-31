import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../shared/constants';
import service from './sales.service';

const fetchSalesRequest = async (req: Request, res: Response) => {
    const supplierCode = req.params.code ? parseInt(req.params.code as string, 10) : undefined;

    if (supplierCode !== undefined && isNaN(supplierCode)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).send({
            message: 'Invalid supplier code',
        });
    }

    if (!supplierCode) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            message: 'Supplier is required.',
        });
    }

    const supplierSales = await service.getSupplierSales(supplierCode);

    return res.json({
        message: 'Sales fetched successfully',
        data: supplierSales,
    });
};

export default { fetchSalesRequest };
