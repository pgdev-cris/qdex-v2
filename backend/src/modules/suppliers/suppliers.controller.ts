import { Request, Response } from 'express';
import service from './suppliers.service';
import { HTTP_STATUS } from '../../shared/constants';
import {
    CreateSupplierRequest,
    UpdateSupplierRequest,
    UpdateSupplierStatus,
} from './suppliers.schema';

const getSuppliersRequest = async (req: Request, res: Response) => {
    const suppliers = await service.getSuppliers();
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Suppliers fetched successfully',
        data: suppliers,
    });
};

const getSupplierRequest = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const supplier = await service.getSupplierById(id);
    if (!supplier) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: HTTP_STATUS.NOT_FOUND,
            message: 'Supplier not found',
        });
    }
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Supplier fetched successfully',
        data: supplier,
    });
};

const createSupplierRequest = async (req: Request, res: Response) => {
    try {
        const data = req.body as CreateSupplierRequest;
        const result = await service.createSupplier(data);
        return res.status(HTTP_STATUS.CREATED).json({
            status: HTTP_STATUS.CREATED,
            message: 'Supplier created successfully',
            data: result,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create supplier';
        return res.status(HTTP_STATUS.CONFLICT).json({
            status: HTTP_STATUS.CONFLICT,
            message,
        });
    }
};

const updateSupplierRequest = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const data = req.body as UpdateSupplierRequest;
        const updated = await service.updateSupplier(id, data);
        if (!updated) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                status: HTTP_STATUS.NOT_FOUND,
                message: 'Supplier not found',
            });
        }
        return res.status(HTTP_STATUS.OK).json({
            status: HTTP_STATUS.OK,
            message: 'Supplier updated successfully',
            data: updated,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update supplier';
        return res.status(HTTP_STATUS.CONFLICT).json({
            status: HTTP_STATUS.CONFLICT,
            message,
        });
    }
};

const setSupplierStatusRequest = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const payload = req.body as UpdateSupplierStatus;
    const result = await service.setSupplierStatus(id, payload);
    if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: HTTP_STATUS.NOT_FOUND,
            message: 'Supplier not found',
        });
    }
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: `Supplier status set to ${payload.status}`,
        data: result,
    });
};

export default {
    getSuppliersRequest,
    getSupplierRequest,
    createSupplierRequest,
    updateSupplierRequest,
    setSupplierStatusRequest,
};
