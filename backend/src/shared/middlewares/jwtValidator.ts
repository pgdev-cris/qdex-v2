import { HTTP_STATUS } from '../constants';
import { verifyToken } from '../utils/jwt.util';

export const jwtValidator = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
            status: HTTP_STATUS.UNAUTHORIZED,
            message: 'Unauthorized Access',
        });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        req.user = verifyToken(token);
        next();
    } catch (error) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
            status: HTTP_STATUS.UNAUTHORIZED,
            message: 'Invalid or expired token',
        });
    }
};
