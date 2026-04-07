import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';
import { HTTP_STATUS } from '../constants';

type RequestTarget = 'body' | 'params' | 'query';

interface ValidateSchemas {
    body?: ZodType;
    query?: ZodType;
    params?: ZodType;
}

export const requestValidator =
    (schemas: ValidateSchemas) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const targets: RequestTarget[] = ['body', 'params', 'query'];
        const errors: Record<string, z.core.$ZodIssue[]> = {};

        for (const target of targets) {
            const schema = schemas[target];
            if (!schema) continue;

            const result = schema.safeParse(req[target]);

            if (!result.success) {
                errors[target] = result.error.issues;
            } else if (target !== 'query') {
                // Express v5 makes req.query a getter-only property — skip reassignment.
                // body and params are writable so we still apply coerced/defaulted values.
                (req as unknown as Record<string, unknown>)[target] = result.data;
            }
        }

        if (Object.keys(errors).length > 0) {
            const formatted = Object.fromEntries(
                Object.entries(errors).map(([target, issues]) => [
                    target,
                    Object.fromEntries(
                        issues.map((issue) => [issue.path.join('.') || '_root', issue.message]),
                    ),
                ]),
            );

            console.error('Validation errors:', formatted);

            res.status(HTTP_STATUS.BAD_REQUEST).json({
                status: HTTP_STATUS.BAD_REQUEST,
                message: 'Validation failed',
                errors: formatted,
            });
            return;
        }

        next();
    };
