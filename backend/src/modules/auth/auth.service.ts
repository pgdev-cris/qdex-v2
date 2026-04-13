import repository from './../../shared/repository/auth.repository';
import { signToken } from '../../shared/utils/jwt.util';
import menuService from '../menu/menu.services';
import eventsService from '../events/events.service';

const login = async (username: string, password: string) => {
    console.log(username, password);
    const user = await repository.getUserByUsername(username);
    if (!user) {
        throw new Error('Invalid username or password');
    }

    // Verify password (plain text comparison for now as per users.service.ts TODO)
    if (user.password !== password) {
        throw new Error('Invalid username or password');
    }

    // Create a payload without the password
    const { password: _, ...payload } = user;
    const token = signToken(payload);
    // menu_preset_id is now a column on tbl_users — no separate table lookup needed
    const presetId = user.menu_preset_id ?? null;
    const menu = presetId !== null ? await menuService.getMenuPreset(presetId) : null;
    const currentEvent = await eventsService.getCurrentEvent();

    return {
        ...user,
        token,
        menu,
        currentEvent,
    };
};

const verifyOverride = async (username: string, password: string): Promise<number> => {
    const user = await repository.getUserByUsername(username);
    if (!user) {
        throw new Error('Invalid credentials.');
    }
    if (user.password !== password) {
        throw new Error('Invalid credentials.');
    }
    if (!user.can_override) {
        throw new Error('This user is not authorized to approve overrides.');
    }
    return user.id;
};

export default {
    login,
    verifyOverride,
};
