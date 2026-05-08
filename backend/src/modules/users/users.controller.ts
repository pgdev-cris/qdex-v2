import service from './users.service';
import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../shared/constants';
import { CreateUserRequest, UpdateUserRequest, UpdateUserStatus, ChangePasswordRequest } from './users.schema';

const getUsersRequest = async (req: Request, res: Response) => {
    const users = await service.getUsers();
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Users fetched successfully',
        data: users,
    });
};

const getUserRequest = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const user = await service.getUserById(id);
    if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: HTTP_STATUS.NOT_FOUND,
            message: 'User not found',
        });
    }
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'User fetched successfully',
        data: user,
    });
};

const saveUserRequest = async (req: Request, res: Response) => {
    const user = req.body as CreateUserRequest;
    const newUser = await service.createUser(user);
    return res.status(HTTP_STATUS.CREATED).json({
        status: HTTP_STATUS.CREATED,
        message: 'User created successfully',
        data: newUser,
    });
};

const updateUserRequest = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = req.body as UpdateUserRequest;
    const updated = await service.updateUser(id, data);
    if (!updated) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: HTTP_STATUS.NOT_FOUND,
            message: 'User not found',
        });
    }
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'User updated successfully',
        data: updated,
    });
};

const setUserStatusRequest = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const payload = req.body as UpdateUserStatus;
    const result = await service.setUserStatus(id, payload);
    if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: HTTP_STATUS.NOT_FOUND,
            message: 'User not found',
        });
    }
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: `User status set to ${payload.status}`,
        data: result,
    });
};

const changePasswordRequest = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const payload = req.body as ChangePasswordRequest;
    const result = await service.changePassword(id, payload);
    if (result === null) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: HTTP_STATUS.NOT_FOUND,
            message: 'User not found',
        });
    }
    if (result === 'invalid_old_password') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            status: HTTP_STATUS.BAD_REQUEST,
            message: 'Old password is incorrect',
        });
    }
    return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: 'Password changed successfully',
        data: result,
    });
};

export default {
    getUsersRequest,
    getUserRequest,
    saveUserRequest,
    updateUserRequest,
    setUserStatusRequest,
    changePasswordRequest,
};
