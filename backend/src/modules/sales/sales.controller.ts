import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../shared/constants';
import service from './sales.service';

const fetchSalesRequest = async (req: Request, res: Response) => {
    const vendorCode = req.params.code ? parseInt(req.params.code as string, 10) : undefined;

    if (vendorCode !== undefined && isNaN(vendorCode)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).send({
            message: 'Invalid vendor code',
        });
    }

    if (!vendorCode) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            message: 'Vendor is required.',
        });
    }

    const vendorSales = await service.getVendorSalesMock(vendorCode);

    return res.json({
        message: 'Sales fetched successfully',
        data: vendorSales,
    });
};

export default { fetchSalesRequest };
