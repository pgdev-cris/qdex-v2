import { z } from 'zod';

export const RemittanceReportQuerySchema = z.object({
    from: z.string().optional(), // ISO date YYYY-MM-DD — start of remitted_at range
    to: z.string().optional(), // ISO date YYYY-MM-DD — end of remitted_at range
    supplier_code: z.string().optional(),
    event_code: z.string().optional(),
    is_partial: z.enum(['true', 'false']).optional(),
    limit: z.string().regex(/^\d+$/).optional().default('100'),
    offset: z.string().regex(/^\d+$/).optional().default('0'),
});

export type RemittanceReportQuery = z.infer<typeof RemittanceReportQuerySchema>;
