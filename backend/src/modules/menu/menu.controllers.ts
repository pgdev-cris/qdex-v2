import { Request, Response } from 'express';
import service from './menu.services';
import { MenuRequestBody } from './menu.type';

const createMenuRequest = async (req: Request<{}, {}, MenuRequestBody>, res: Response) => {
    const body = req.body;

    await service.createMenu(body);

    return res.json({
        message: 'Menu created successfully',
    });
};

const getMenuPresetRequest = async (req: Request, res: Response) => {
    // req.params.id is coerced to number by requestValidator (z.coerce.number)
    const id = req.params.id as unknown as number;

    const data = await service.getMenuPreset(id);

    if (!data) {
        return res.status(404).json({ message: 'Menu preset not found' });
    }

    return res.json({
        message: 'Menu preset fetched successfully',
        data,
    });
};

export default { createMenuRequest, getMenuPresetRequest };
