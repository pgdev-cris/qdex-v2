import { z } from 'zod';
import { GetMenuPresetRequestParamsSchema, MenuRequestBodySchema } from './menu.schema';

// ─── Request types ────────────────────────────────────────────────────────────

export type MenuRequestBody = z.infer<typeof MenuRequestBodySchema>;

export type GetMenuPresetRequestParams = z.infer<typeof GetMenuPresetRequestParamsSchema>;

// ─── DB row types ─────────────────────────────────────────────────────────────

export interface MenuRow {
    id: number;
    parent_id: number | null;
    name: string;
    url: string | null;
    icon: string | null;
    sort: number;
    target: string | null;
    is_active: 0 | 1;
    created_at: Date | null;
    target_modal: string | null;
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface MenuTreeNode extends MenuRow {
    children: MenuTreeNode[];
}

export interface MenuPreset {
    id: number;
    name: string;
    menus: MenuTreeNode[];
}
