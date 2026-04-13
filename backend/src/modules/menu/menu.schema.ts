import { z } from 'zod';

const activeFlagSchema = z.union([z.literal(0), z.literal(1)]);

const menuChildSchema = z.object({
    name: z.string().min(1, 'Child name is required'),
    url: z.string().nullable(),
    icon: z.string().nullable(),
    sort: z.number().int().min(0),
    target: z.string().min(1),
    modal_target: z.string().nullable(),
    is_active: activeFlagSchema,
});

const parentMenuSchema = z.object({
    menu: z.object({
        name: z.string().min(1, 'Name is required'),
        icon: z.string().nullable(),
        sort: z.number().int().min(0),
        is_active: activeFlagSchema,
        parent_id: z.null(),
        url: z.null(),
    }),
    preset_ids: z.array(z.number().int()),
    existing_child_ids: z.array(z.number().int()),
    children: z.array(menuChildSchema),
});

const childMenuSchema = z.object({
    menu: z.object({
        name: z.string().min(1, 'Name is required'),
        url: z.string().min(1, 'URL is required'),
        icon: z.string().nullable(),
        sort: z.number().int().min(0),
        target: z.string().min(1),
        parent_id: z.number().int().positive('Parent menu is required'),
        is_active: activeFlagSchema,
    }),
    preset_ids: z.array(z.number().int()),
});

export const MenuRequestBodySchema = z
    .any()
    .superRefine((data, ctx) => {
        const isParent = data?.menu?.parent_id === null || data?.menu?.parent_id === undefined;
        const schema = isParent ? parentMenuSchema : childMenuSchema;
        const result = schema.safeParse(data);

        if (!result.success) {
            for (const issue of result.error.issues) {
                ctx.addIssue({
                    code: 'custom',
                    path: issue.path,
                    message: issue.message,
                });
            }
        }
    })
    .transform((data) => {
        const isParent = data?.menu?.parent_id === null || data?.menu?.parent_id === undefined;
        // Re-parse to get the typed output
        return (isParent ? parentMenuSchema : childMenuSchema).parse(data);
    });

export const GetMenuPresetRequestParamsSchema = z.object({
    id: z.coerce.number().int().positive('Invalid preset ID'),
});
