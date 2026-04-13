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

// Transaction report query (used by GET /api/v1/reports/transactions)
export const TransactionReportQuerySchema = z.object({
    from: z.string().optional(), // YYYY-MM-DD — start of transacted_at
    to: z.string().optional(), // YYYY-MM-DD — end of transacted_at
    supplier_code: z.string().optional(),
    event_code: z.string().optional(),
    type: z.string().regex(/^\d+$/).optional(), // 1=Partial, 2=Full
    status: z.string().regex(/^\d+$/).optional(), // 0=Pending,1=Verified,2=Voided
    limit: z.string().regex(/^\d+$/).optional().default('5000'),
    offset: z.string().regex(/^\d+$/).optional().default('0'),
});

export type TransactionReportQuery = z.infer<typeof TransactionReportQuerySchema>;

// Remittance status query — used by GET /api/v1/reports/remittance-status
export const RemittanceStatusQuerySchema = z.object({
    event_id: z.string().regex(/^\d+$/).optional(), // numeric event ID
    from: z.string().optional(), // YYYY-MM-DD
    to: z.string().optional(),   // YYYY-MM-DD
    search: z.string().optional(),
});

export type RemittanceStatusQuery = z.infer<typeof RemittanceStatusQuerySchema>;
