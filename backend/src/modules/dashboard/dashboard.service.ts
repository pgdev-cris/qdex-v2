import repository, { DashboardStats } from './dashboard.repository';

const getDashboardData = async (eventId: number): Promise<DashboardStats> => {
    return await repository.getDashboardStats(eventId);
};

export default { getDashboardData };
