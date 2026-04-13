import PoolManager from '../../shared/db/pool.manager';
import repository from './menu.repository';
import { MenuPreset, MenuRequestBody, MenuRow, MenuTreeNode } from './menu.type';

const createMenu = async (body: MenuRequestBody): Promise<void> => {
    return await PoolManager.transaction(async (conn) => {
        if ('existing_child_ids' in body) {
            // Parent menu
            //   1. Insert the parent row
            //   2. Link preset(s) to the parent
            //   3. Re-parent any existing child menu items
            //   4. Insert new inline children

            const parentId = await repository.insertMenu(conn, {
                name: body.menu.name,
                url: null,
                icon: body.menu.icon,
                sort: body.menu.sort,
                target: null,
                is_active: body.menu.is_active,
                parent_id: null,
                target_modal: null,
            });

            await repository.insertMenuPresetItems(conn, parentId, body.preset_ids);
            await repository.assignChildrenToParent(conn, parentId, body.existing_child_ids);

            for (const child of body.children) {
                await repository.insertMenu(conn, {
                    name: child.name,
                    url: child.url,
                    icon: child.icon,
                    sort: child.sort,
                    target: child.target,
                    is_active: child.is_active,
                    parent_id: parentId,
                    target_modal: child.modal_target, // payload: modal_target → db: target_modal
                });
            }
        } else {
            // Child (standalone) menu
            //   1. Insert the child row under the given parent
            //   2. Link preset(s) to the child

            const childId = await repository.insertMenu(conn, {
                name: body.menu.name,
                url: body.menu.url,
                icon: body.menu.icon,
                sort: body.menu.sort,
                target: body.menu.target,
                is_active: body.menu.is_active,
                parent_id: body.menu.parent_id,
                target_modal: null,
            });

            await repository.insertMenuPresetItems(conn, childId, body.preset_ids);
        }
    }, 'auth-pool');
};

/**
 * Converts a flat list of MenuRows into a parent→children tree.
 * Nodes whose parent_id is null (or whose parent is not in the list) become roots.
 * Roots and their children are each sorted by `sort` ASC.
 */
const buildMenuTree = (rows: MenuRow[]): MenuTreeNode[] => {
    const nodeMap = new Map<number, MenuTreeNode>();

    for (const row of rows) {
        nodeMap.set(row.id, { ...row, children: [] });
    }

    const roots: MenuTreeNode[] = [];

    for (const node of nodeMap.values()) {
        if (node.parent_id !== null && nodeMap.has(node.parent_id)) {
            nodeMap.get(node.parent_id)!.children.push(node);
        } else {
            roots.push(node);
        }
    }

    roots.sort((a, b) => a.sort - b.sort);
    for (const root of roots) {
        root.children.sort((a, b) => a.sort - b.sort);
    }

    return roots;
};

const getMenuPreset = async (presetId: number): Promise<MenuPreset | null> => {
    const preset = await repository.getPresetById(presetId);

    if (!preset) return null;

    const rows = await repository.getMenusByPresetId(presetId);

    return { ...preset, menus: buildMenuTree(rows) };
};

const getAllPresets = async (): Promise<Pick<MenuPreset, 'id' | 'name'>[]> => {
    return await repository.getAllPresets();
};

export default { createMenu, getMenuPreset, getAllPresets };
