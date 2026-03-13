import repository from './../../shared/repository/auth.repository';
import { signToken } from '../../shared/utils/jwt.util';

const login = async (username: string, password: string) => {
    console.log(username, password);
    const user = await repository.getUserByUsername(username);
    if (!user) {
        throw new Error('User not found');
    }

    const token = signToken(user);

    return {
        ...user,
        token,
    };
};

export default {
    login,
};
