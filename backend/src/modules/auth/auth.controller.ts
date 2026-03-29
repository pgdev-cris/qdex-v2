import service from './auth.service';
import { Request, Response } from 'express';
import { LoginRequestBody } from './auth.type';

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

export default {
    loginRequest,
};
