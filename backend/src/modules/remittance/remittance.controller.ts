import { Request, Response } from 'express';
import remittanceService from './remittance.service';
import { PartialRemitPayload, FullRemitPayload } from './remittance.type';

const validateBody = (body: PartialRemitPayload | FullRemitPayload, res: Response) => {
    if (!body?.supplier_code) {
        res.status(400).json({ result: 'error', message: 'supplier_code is required.' });
        return;
    }

    if (!body?.remitter_name?.trim()) {
        res.status(400).json({ result: 'error', message: 'remitter_name is required.' });
        return;
    }

    if (!Array.isArray(body?.lines) || body.lines.length === 0) {
        res.status(400).json({ result: 'error', message: 'lines are required.' });
        return;
    }
};

const partialRemitRequest = async (req: Request, res: Response) => {
    const body = req.body as PartialRemitPayload;
    const userId: number = (req as any).user?.id;

    validateBody(body, res);

    const data = await remittanceService.partialRemit(body, userId);

    return res.json({
        result: 'success',
        message: 'Partial remittance recorded successfully.',
        data,
    });
};

const fullRemitRequest = async (req: Request, res: Response) => {
    const body = req.body as FullRemitPayload;
    const userId: number = (req as any).user?.id;

    validateBody(body, res);

    const data = await remittanceService.fullRemit(body, userId);

    return res.json({
        result: 'success',
        message: 'Full remittance recorded successfully.',
        data,
    });
};

const getPartialSummaryRequest = async (req: Request, res: Response) => {
    const supplierCode = req.params.supplier_code;
    if (!supplierCode) {
        return res.status(400).json({ result: 'error', message: 'supplier_code is required.' });
    }
    const data = await remittanceService.getPartialSummary(supplierCode);
    return res.json({ result: 'success', message: 'Partial summary fetched.', data });
};

export default { partialRemitRequest, fullRemitRequest, getPartialSummaryRequest };
