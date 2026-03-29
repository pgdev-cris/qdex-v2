import { z } from 'zod';

export const CreateUserRequestSchema = z.object({
    username: z.string().min(1),
    first_name: z.string().min(1),
    middle_name: z.string().optional(),
    last_name: z.string().min(1),
    department: z.string().min(1),
    role: z.string().min(1),
    password: z.string().min(8),
});

export const UpdateUserRequestSchema = z.object({
    first_name: z.string().min(1).optional(),
    middle_name: z.string().optional(),
    last_name: z.string().min(1).optional(),
    department: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
});

export const UpdateUserStatusSchema = z.object({
    status: z.enum(['active', 'inactive', 'deleted']),
});

export const UserIdParamSchema = z.object({
    id: z.string().regex(/^\d+$/, 'id must be a number'),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UpdateUserStatus = z.infer<typeof UpdateUserStatusSchema>;
