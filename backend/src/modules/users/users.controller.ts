import service from './users.service';
import { Request, Response } from 'express';
import {HTTP_STATUS} from "../../shared/constants";

const getUsers = async (req: Request, res: Response) => {
    const users = await service.getUsers();

    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Users fetched successfully',
        data: users,
    })
}

export default {
    getUsers,
};