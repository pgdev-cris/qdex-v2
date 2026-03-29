import { z } from 'zod';

export const CreateSupplierSchema = z.object({
    supplier_code: z.string().min(1).toUpperCase(),
    supplier_name: z.string().min(1),
});

export const UpdateSupplierSchema = z.object({
    supplier_code: z.string().min(1).toUpperCase().optional(),
    supplier_name: z.string().min(1).optional(),
});

export const UpdateSupplierStatusSchema = z.object({
    status: z.enum(['active', 'inactive', 'deleted']),
});

export const SupplierIdParamSchema = z.object({
    id: z.string().regex(/^\d+$/, 'id must be a number'),
});

export type CreateSupplierRequest = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplierRequest = z.infer<typeof UpdateSupplierSchema>;
export type UpdateSupplierStatus = z.infer<typeof UpdateSupplierStatusSchema>;
