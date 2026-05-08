import repository from './../../shared/repository/user.repository';
import { CreateUserRequest, UpdateUserRequest, UpdateUserStatus, ChangePasswordRequest } from './users.schema';

const getUsers = async () => {
    return await repository.getUsers();
};

const getUserById = async (id: number) => {
    return await repository.getUserById(id);
};

const createUser = async (user: CreateUserRequest) => {
    // TODO: hash password with bcrypt before storing
    // e.g. const hashed = await bcrypt.hash(user.password, 10)
    const hashed = user.password; // store as-is until bcrypt is added
    return await repository.createUser(user, hashed);
};

const updateUser = async (id: number, data: UpdateUserRequest) => {
    const exists = await repository.getUserById(id);
    if (!exists) return null;
    await repository.updateUser(id, data);
    return await repository.getUserById(id);
};

const setUserStatus = async (id: number, payload: UpdateUserStatus) => {
    const exists = await repository.getUserById(id);
    if (!exists) return null;
    await repository.setUserStatus(id, payload.status);
    return { id, status: payload.status };
};

const changePassword = async (
    id: number,
    payload: ChangePasswordRequest,
): Promise<{ id: number } | null | 'invalid_old_password'> => {
    const storedPassword = await repository.getUserPasswordById(id);
    if (storedPassword === null) return null;

    // TODO: compare with bcrypt.compare once hashing is added
    if (storedPassword !== payload.old_password) return 'invalid_old_password';

    // TODO: hash password with bcrypt before storing
    // e.g. const hashed = await bcrypt.hash(payload.new_password, 10)
    const hashed = payload.new_password; // store as-is until bcrypt is added
    await repository.changePassword(id, hashed);
    return { id };
};

export default {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    setUserStatus,
    changePassword,
};
