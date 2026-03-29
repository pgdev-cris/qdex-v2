import repository from './reports.repository';
import { RemittanceReportQuery } from './reports.schema';

const getRemittanceReport = async (query: RemittanceReportQuery) => {
    const [transactions, summary] = await Promise.all([
        repository.getRemittances(query),
        repository.getRemittanceSummary(query),
    ]);
    return { summary, transactions };
};

const getRemittanceSummary = async (query: RemittanceReportQuery) => {
    return await repository.getRemittanceSummary(query);
};

const getRemittanceById = async (id: number) => {
    return await repository.getRemittanceById(id);
};

export default {
    getRemittanceReport,
    getRemittanceSummary,
    getRemittanceById,
};
