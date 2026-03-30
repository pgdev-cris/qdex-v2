import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../shared/constants';
import service from './dashboard.service';

const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const stats = await service.getDashboardData();
        return res.json({
            message: 'Dashboard stats fetched successfully',
            data: stats,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: 'Internal server error',
        });
    }
};

export default { getDashboardStats };
