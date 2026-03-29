import { PoolConnection, ResultSetHeader } from 'mysql2/promise';
import PoolManager from '../../shared/db/pool.manager';
import { MenuPreset, MenuRow } from './menu.type';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface InsertMenuData {
    name: string;
    url: string | null;
    icon: string | null;
    sort: number;
    target: string | null;
    is_active: 0 | 1;
    parent_id: number | null;
    target_modal: string | null;
}

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

/**
 * Inserts a single row into tbl_menu and returns the new auto-increment id.
 */
const insertMenu = async (conn: PoolConnection, data: InsertMenuData): Promise<number> => {
    const [result] = await conn.execute<ResultSetHeader>(
        `
        INSERT INTO tbl_menu
            (name, url, icon, sort, target, is_active, parent_id, target_modal, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
            data.name,
            data.url,
            data.icon,
            data.sort,
            data.target,
            data.is_active,
            data.parent_id,
            data.target_modal,
        ],
    );

    return result.insertId;
};

/**
 * Bulk-inserts rows into tbl_menu_preset_items linking a menu to preset(s).
 * No-ops if presetIds is empty.
 */
const insertMenuPresetItems = async (
    conn: PoolConnection,
    menuId: number,
    presetIds: number[],
): Promise<void> => {
    if (presetIds.length === 0) return;

    const placeholders = presetIds.map(() => '(?, ?)').join(', ');
    const values = presetIds.flatMap((presetId) => [presetId, menuId]);

    await conn.execute(
        `INSERT INTO tbl_menu_preset_items (preset_id, menu_id) VALUES ${placeholders}`,
        values,
    );
};

/**
 * Re-parents existing menu items by setting their parent_id.
 * Used when an existing child is linked to a newly created parent.
 * No-ops if childIds is empty.
 */
const assignChildrenToParent = async (
    conn: PoolConnection,
    parentId: number,
    childIds: number[],
): Promise<void> => {
    if (childIds.length === 0) return;

    const placeholders = childIds.map(() => '?').join(', ');

    await conn.execute(`UPDATE tbl_menu SET parent_id = ? WHERE id IN (${placeholders})`, [
        parentId,
        ...childIds,
    ]);
};

/**
 * Fetches a single preset by id. Returns null if not found.
 */
const getPresetById = async (presetId: number): Promise<Pick<MenuPreset, 'id' | 'name'> | null> => {
    const rows = await PoolManager.query<Pick<MenuPreset, 'id' | 'name'>[]>(
        'SELECT id, name FROM tbl_menu_presets WHERE id = ? LIMIT 1',
        [presetId],
        'auth-pool',
    );

    return rows[0] ?? null;
};

/**
 * Fetches all tbl_menu rows linked to a preset via tbl_menu_preset_items.
 * `is_active + 0` casts bit(1) → integer so it serialises as 0 or 1.
 */
const getMenusByPresetId = async (presetId: number): Promise<MenuRow[]> => {
    return await PoolManager.query<MenuRow[]>(
        `SELECT
            m.id,
            m.parent_id,
            m.name,
            m.url,
            m.icon,
            m.sort,
            m.target,
            m.is_active + 0  AS is_active,
            m.created_at,
            m.target_modal
         FROM tbl_menu m
         INNER JOIN tbl_menu_preset_items pi ON pi.menu_id = m.id
         WHERE pi.preset_id = ?
         ORDER BY m.sort ASC`,
        [presetId],
        'auth-pool',
    );
};

export default {
    insertMenu,
    insertMenuPresetItems,
    assignChildrenToParent,
    getPresetById,
    getMenusByPresetId,
};
