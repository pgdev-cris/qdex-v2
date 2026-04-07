import repository, { DashboardStats } from './dashboard.repository';

const getDashboardData = async (): Promise<DashboardStats> => {
    return await repository.getDashboardStats();
};

export default { getDashboardData };
