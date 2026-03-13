import service from './auth.services';
import { Request, Response } from 'express';
import { LoginRequestBody } from './auth.types';
import {HTTP_STATUS} from "../../shared/constants";

/**
 * Handle login request.
 *
 * @param req
 * @param res
 */
const loginRequest = async (req: Request<{}, {}, LoginRequestBody>, res: Response) => {
    const { username, password } = req.body;

    const user = await service.login(username, password);

    return res.status(HTTP_STATUS.OK).json({
        message: 'Login successful',
        data: user,
    });
}

export default {
    loginRequest,
};