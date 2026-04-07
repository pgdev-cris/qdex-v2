import monitoringRepository from './monitoring.repository';
import { NotFoundError } from '../../shared/errors';
import { TRANSACTION_TYPE, TRANSACTION_STATUS, TENDER_TYPE } from '../../shared/constants';
import {
    ListTransactionsQuery,
    PaginatedResult,
    TransactionRow,
    TransactionWithDetails,
} from './monitoring.type';
import { Receipt } from '../remittance/remittance.type';

const TENDER_LABEL: Record<number, string> = Object.fromEntries(
    Object.entries(TENDER_TYPE).map(([label, id]) => [id, label]),
);

const TYPE_LABEL: Record<number, string> = {
    [TRANSACTION_TYPE.PARTIAL]: 'Partial',
    [TRANSACTION_TYPE.FULL]: 'Full',
};

const STATUS_LABEL: Record<number, string> = {
    [TRANSACTION_STATUS.PENDING]: 'Pending',
    [TRANSACTION_STATUS.VERIFIED]: 'Verified',
    [TRANSACTION_STATUS.VOIDED]: 'Voided',
};

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
        remit_type: transaction.remit_type === TRANSACTION_TYPE.FULL ? 'full' : 'partial',
        lines: transaction.details.map((d) => ({
            method: TENDER_LABEL[d.tender_type] || 'UNKNOWN',
            amount: String(d.amount),
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

export { TYPE_LABEL, STATUS_LABEL, TENDER_LABEL };
export default { listTransactions, getTransaction, reprintTransaction };
