import { Request, Response } from 'express';
import remittanceService from './remittance.service';
import { PartialRemitPayload } from './remittance.type';

//  Helpers

function pad(n: number, len = 2) {
    return String(n).padStart(len, '0');
}

function genCodes(isPartial: boolean) {
    const now = new Date();
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const seq = pad(Math.floor(Math.random() * 9999), 4);
    const prefix = isPartial ? 'PRT' : 'FUL';
    const receiptNo = `RCP-${date}-${seq}`;
    const referenceCode = `${prefix}-${date}-${seq}`;
    return { receiptNo, referenceCode };
}

function isoNow() {
    return new Date().toISOString();
}

//  Controllers

const partialRemitRequest = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as PartialRemitPayload;
    const userId: number = (req as any).user?.auto_id;

    if (!body?.vendor_code) {
        res.status(400).json({ result: 'error', message: 'vendor_code is required.' });
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

    try {
        const data = await remittanceService.partialRemit(body, userId);

        res.status(200).json({
            result: 'success',
            message: 'Partial remittance recorded successfully.',
            data,
        });
    } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode ?? 500;
        const message =
            err instanceof Error ? err.message : 'Failed to process partial remittance.';
        res.status(status).json({ result: 'error', message });
    }
};

const fullRemitRequest = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
        vendor_code?: string;
        vendor_name?: string;
        remitter_name?: string;
        lines?: unknown[];
    };

    if (!body?.vendor_code) {
        res.status(400).json({ result: 'error', message: 'vendor_code is required.' });
        return;
    }

    const { receiptNo, referenceCode } = genCodes(false);
    const remittedAt = isoNow();

    res.status(200).json({
        result: 'success',
        message: 'Full remittance recorded successfully.',
        data: {
            receipt_no: receiptNo,
            reference_code: referenceCode,
            vendor_code: body.vendor_code,
            vendor_name: body.vendor_name ?? '',
            remitter_name: body.remitter_name ?? '',
            remit_type: 'full',
            lines: body.lines ?? [],
            remitted_at: remittedAt,
        },
    });
};

export default { partialRemitRequest, fullRemitRequest };
