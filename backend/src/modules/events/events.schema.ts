import { z } from 'zod';

export const CreateEventSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1).toUpperCase(),
    period_start: z.string().optional(), // ISO datetime string
    period_end: z.string().optional(),
    status: z.union([z.literal(0), z.literal(1)]).default(0),
});

export const UpdateEventSchema = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).toUpperCase().optional(),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
});

export const UpdateEventStatusSchema = z.object({
    status: z.union([z.literal(0), z.literal(1)]),
});

export const EventIdParamSchema = z.object({
    id: z.string().regex(/^\d+$/, 'id must be a number'),
});

export type CreateEventRequest = z.infer<typeof CreateEventSchema>;
export type UpdateEventRequest = z.infer<typeof UpdateEventSchema>;
export type UpdateEventStatus = z.infer<typeof UpdateEventStatusSchema>;
