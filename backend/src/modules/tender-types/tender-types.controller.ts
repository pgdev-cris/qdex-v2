import { Request, Response } from 'express';
import repository from './tender-types.repository';

const getAllRequest = async (_req: Request, res: Response) => {
    const rows = await repository.getAll();
    return res.json({ result: 'success', data: rows });
};

export default { getAllRequest };
