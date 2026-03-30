import { Request, Response } from 'express';
import monitoringService from './monitoring.service';
import { ListTransactionsQuery } from './monitoring.type';

const listTransactionsRequest = async (req: Request, res: Response) => {
    const query: ListTransactionsQuery = {
        search: req.query.search as string | undefined,
        type: req.query.type !== undefined ? Number(req.query.type) : undefined,
        status: req.query.status !== undefined ? Number(req.query.status) : undefined,
        page: req.query.page !== undefined ? Number(req.query.page) : 1,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : 20,
    };

    const result = await monitoringService.listTransactions(query);

    return res.json({
        result: 'success',
        ...result,
    });
};

const getTransactionRequest = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
        res.status(400).json({ result: 'error', message: 'Invalid transaction ID.' });
        return;
    }

    const data = await monitoringService.getTransaction(id);

    return res.json({
        result: 'success',
        data,
    });
};

const reprintTransactionRequest = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const user = (req as any).user;
    const printedBy = user ? `${user.first_name} ${user.last_name}`.trim() : 'System';

    if (!id || isNaN(id)) {
        res.status(400).json({ result: 'error', message: 'Invalid transaction ID.' });
        return;
    }

    const data = await monitoringService.reprintTransaction(id, printedBy);

    return res.json({
        result: 'success',
        data,
    });
};

export default { listTransactionsRequest, getTransactionRequest, reprintTransactionRequest };
