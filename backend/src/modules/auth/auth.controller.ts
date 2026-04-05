import service from './auth.service';
import { Request, Response } from 'express';
import { LoginRequestBody } from './auth.type';
import { jwtValidator } from '../../shared/middlewares/jwtValidator';

/**
 * Handle login request.
 *
 * @param req
 * @param res
 */
const loginRequest = async (req: Request<{}, {}, LoginRequestBody>, res: Response) => {
    const { username, password } = req.body;

    const user = await service.login(username, password);

    return res.json({
        message: 'Login successful',
        data: user,
    });
};

const overrideRequest = async (req: Request, res: Response) => {
    const { username, password } = req.body as { username: string; password: string };
    if (!username?.trim() || !password) {
        return res.status(400).json({ result: 'error', message: 'username and password are required.' });
    }
    const approverId = await service.verifyOverride(username.trim(), password);
    return res.json({ result: 'success', message: 'Override approved.', data: { approver_id: approverId } });
};

export default {
    loginRequest,
    overrideRequest,
};
