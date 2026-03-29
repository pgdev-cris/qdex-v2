import repository from './../../shared/repository/auth.repository';
import { signToken } from '../../shared/utils/jwt.util';
import menuService from '../menu/menu.services';

const login = async (username: string, password: string) => {
    console.log(username, password);
    const user = await repository.getUserByUsername(username);
    if (!user) {
        throw new Error('User not found');
    }

    const token = signToken(user);
    const presetId = await repository.getUserMenuPresetId(user.auto_id);
    const menu = presetId !== null ? await menuService.getMenuPreset(presetId) : [];

    return {
        ...user,
        token,
        menu,
    };
};

export default {
    login,
};
