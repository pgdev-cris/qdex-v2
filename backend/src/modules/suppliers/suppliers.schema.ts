import { z } from 'zod';

export const CreateSupplierSchema = z.object({
    code: z.number().int().min(1),
    name: z.string().min(1),
});

export const UpdateSupplierSchema = z.object({
    code: z.number().int().min(1).optional(),
    name: z.string().min(1).optional(),
});

export const UpdateSupplierStatusSchema = z.object({
    status: z.number().int(),
});

export const SupplierIdParamSchema = z.object({
    id: z.string().regex(/^\d+$/, 'id must be a number'),
});

export type CreateSupplierRequest = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplierRequest = z.infer<typeof UpdateSupplierSchema>;
export type UpdateSupplierStatus = z.infer<typeof UpdateSupplierStatusSchema>;
