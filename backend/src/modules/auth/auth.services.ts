import repository from './../../shared/repository/auth.repository';

const login = async (username: string, password: string) => {
    console.log(username, password);
    const user = await repository.getUserByUsername(username);
    if (!user) {
        throw new Error('User not found');
    }

    return user;
}

export default {
    login,
}