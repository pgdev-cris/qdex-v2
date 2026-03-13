import repository from './../../shared/repository/user.repository';

const getUsers = async () => {
    return await repository.getUsers();
};

export default {
    getUsers,
};
