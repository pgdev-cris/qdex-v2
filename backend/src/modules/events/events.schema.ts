import { z } from 'zod';

export const CreateEventSchema = z.object({
    event_code: z.string().min(1).toUpperCase(),
    event_name: z.string().min(1),
    event_category: z.string().optional(),
    event_location: z.string().optional(),
    event_start_date: z.string().optional(),  // ISO date string YYYY-MM-DD
    event_end_date: z.string().optional(),
    event_status: z.enum(['upcoming', 'active', 'completed', 'cancelled']).default('upcoming'),
});

export const UpdateEventSchema = z.object({
    event_code: z.string().min(1).toUpperCase().optional(),
    event_name: z.string().min(1).optional(),
    event_category: z.string().optional(),
    event_location: z.string().optional(),
    event_start_date: z.string().optional(),
    event_end_date: z.string().optional(),
    event_status: z.enum(['upcoming', 'active', 'completed', 'cancelled']).optional(),
});

export const UpdateEventStatusSchema = z.object({
    status: z.enum(['upcoming', 'active', 'completed', 'cancelled', 'deleted']),
});

export const EventIdParamSchema = z.object({
    id: z.string().regex(/^\d+$/, 'id must be a number'),
});

export type CreateEventRequest = z.infer<typeof CreateEventSchema>;
export type UpdateEventRequest = z.infer<typeof UpdateEventSchema>;
export type UpdateEventStatus = z.infer<typeof UpdateEventStatusSchema>;
