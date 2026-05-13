import monitoringRepository from './monitoring.repository';
import { NotFoundError } from '../../shared/errors';
import { TRANSACTION_TYPE, TRANSACTION_STATUS } from '../../shared/constants';
import {
    ListTransactionsQuery,
    PaginatedResult,
    TransactionRow,
    TransactionWithDetails,
} from './monitoring.type';
import { Receipt } from '../remittance/remittance.type';

const listTransactions = async (
    query: ListTransactionsQuery,
): Promise<PaginatedResult<TransactionRow>> => {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const { rows, total } = await monitoringRepository.listTransactions({ ...query, page, limit });

    return {
        data: rows,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
    };
};

const getTransaction = async (id: number): Promise<TransactionWithDetails> => {
    const transaction = await monitoringRepository.getTransactionById(id);

    if (!transaction) {
        throw new NotFoundError(`Transaction #${id} not found.`);
    }

    return transaction;
};

const reprintTransaction = async (id: number, printedBy: string): Promise<Receipt> => {
    const transaction = await monitoringRepository.getTransactionById(id);

    if (!transaction) {
        throw new NotFoundError(`Transaction #${id} not found.`);
    }

    // Map to frontend Receipt type
    return {
        trans_no: transaction.receipt_no,
        ref_code: transaction.reference_code,
        supplier_code: String(transaction.supplier_code),
        supplier_name: transaction.supplier_name,
        remitter_name: transaction.remitted_by,
        remit_type: transaction.remit_type === TRANSACTION_TYPE.MANUAL ? 'manual' : transaction.remit_type === TRANSACTION_TYPE.FULL ? 'full' : 'partial',
        is_voided: transaction.status === TRANSACTION_STATUS.VOIDED,
        is_prev_sales_only: transaction.is_prev_sales_only === 1,
        lines: transaction.details.map((d) => ({
            method: d.tender_code ?? `TENDER_${d.tender_type}`,
            amount: String(d.amount),
            is_prev_sales: d.is_prev_sales === 1,
        })),
        verified_at: new Date(transaction.transacted_at).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        }),
        gen_at: new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        }),
        printed_by: printedBy,
        event_name: transaction.event_name,
        event_code: transaction.event_code,
    };
};

export default { listTransactions, getTransaction, reprintTransaction };
