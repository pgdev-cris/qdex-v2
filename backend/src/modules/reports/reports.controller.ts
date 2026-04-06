import { Request, Response } from 'express';
import service from './reports.service';
import { HTTP_STATUS } from '../../shared/constants';
import { RemittanceReportQuery, TransactionReportQuery, RemittanceStatusQuery } from './reports.schema';

/**
 * GET /api/v1/reports/remittances
 * Query params: from, to, supplier_code, event_code, is_partial, limit, offset
 * Returns both the transaction list and an aggregate summary.
 */
const getRemittanceReportRequest = async (req: Request, res: Response) => {
    const query = req.query as RemittanceReportQuery;
    const report = await service.getRemittanceReport(query);
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Remittance report generated successfully',
        data: report,
    });
};

/**
 * GET /api/v1/reports/remittances/summary
 * Returns only the aggregate totals (count, cash, credit, grand total).
 */
const getRemittanceSummaryRequest = async (req: Request, res: Response) => {
    const query = req.query as RemittanceReportQuery;
    const summary = await service.getRemittanceSummary(query);
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Remittance summary generated successfully',
        data: summary,
    });
};

/**
 * GET /api/v1/reports/remittances/:id
 * Returns a single remittance transaction detail.
 */
const getRemittanceDetailRequest = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const record = await service.getRemittanceById(id);
    if (!record) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: HTTP_STATUS.NOT_FOUND,
            message: 'Remittance record not found',
        });
    }
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Remittance detail fetched successfully',
        data: record,
    });
};

/**
 * GET /api/v1/reports/transactions
 * Query params: from, to, supplier_code, event_code, type, status, limit, offset
 */
const getTransactionReportRequest = async (req: Request, res: Response) => {
    const query = req.query as TransactionReportQuery;
    const rows = await service.getTransactionReport(query);
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Transaction report generated successfully',
        data: rows,
    });
};

/**
 * GET /api/v1/reports/supplier-per-tender
 * Groups tender totals per supplier (and event).
 * Query params: from, to, supplier_code, event_code, status
 */
const getSupplierPerTenderRequest = async (req: Request, res: Response) => {
    const query = req.query as TransactionReportQuery;
    const rows = await service.getSupplierPerTenderReport(query);
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Supplier per tender report generated successfully',
        data: rows,
    });
};

/**
 * GET /api/v1/reports/remittance-status
 * Query params: from, to, search
 * Returns all active suppliers with their total_sales, total_remitted, balance, and status.
 */
const getRemittanceStatusRequest = async (req: Request, res: Response) => {
    const query = req.query as RemittanceStatusQuery;
    const report = await service.getRemittanceStatusReport(query);
    return res.status(HTTP_STATUS.OK).json({
        result: 'success',
        data: report,
    });
};

export default {
    getRemittanceReportRequest,
    getRemittanceSummaryRequest,
    getRemittanceDetailRequest,
    getTransactionReportRequest,
    getSupplierPerTenderRequest,
    getRemittanceStatusRequest,
};
