import monitoringRepository from './monitoring.repository';
import { NotFoundError } from '../../shared/errors';
import { TRANSACTION_TYPE, TRANSACTION_STATUS, TENDER_TYPE } from '../../shared/constants';
import {
    ListTransactionsQuery,
    PaginatedResult,
    TransactionRow,
    TransactionWithDetails,
} from './monitoring.type';

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

export { TYPE_LABEL, STATUS_LABEL, TENDER_LABEL };
export default { listTransactions, getTransaction };
