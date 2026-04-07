import { z } from 'zod';

export const CreateUserRequestSchema = z.object({
    username: z.string().min(1),
    first_name: z.string().min(1),
    middle_name: z.string().optional(),
    last_name: z.string().min(1),
    department: z.string().min(1),
    role: z.string().min(1),
    password: z.string().min(8),
    employee_no: z.string().min(1),
    menu_preset_id: z.number().int().positive().optional().nullable(),
    can_override: z.number().int().min(0).max(1).optional().default(0),
});

export const UpdateUserRequestSchema = z.object({
    first_name: z.string().min(1).optional(),
    middle_name: z.string().optional(),
    last_name: z.string().min(1).optional(),
    department: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    employee_no: z.string().min(1).optional(),
    menu_preset_id: z.number().int().positive().optional().nullable(),
    can_override: z.number().int().min(0).max(1).optional(),
});

export const UpdateUserStatusSchema = z.object({
    status: z.number().int(),
});

export const UserIdParamSchema = z.object({
    id: z.string().regex(/^\d+$/, 'id must be a number'),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UpdateUserStatus = z.infer<typeof UpdateUserStatusSchema>;
