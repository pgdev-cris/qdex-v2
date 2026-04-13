// Shared primitives

/** Database bit(1) stored as 0 or 1 */
type ActiveFlag = 0 | 1

// Child item sent inside a parent request

export interface MenuChildPayload {
    name: string
    url: string | null
    icon: string | null
    sort: number
    target: string
    modal_target: string | null
    is_active: ActiveFlag
}

// menu row shape shared by both request types
interface BaseMenuFields {
    name: string
    icon: string | null
    sort: number
    is_active: ActiveFlag
}

/** menu fields when creating a parent (no URL, no parent_id, no target) */
interface ParentMenuFields extends BaseMenuFields {
    parent_id: null
    url: null
}

/** menu fields when creating a child (URL and parent required) */
interface ChildMenuFields extends BaseMenuFields {
    url: string
    parent_id: number
    target: string
}

// Request body variants

export interface ParentMenuRequestBody {
    menu: ParentMenuFields
    preset_ids: number[]
    /** IDs of existing menu items to re-attach as children */
    existing_child_ids: number[]
    /** Brand-new child items to create alongside this parent */
    children: MenuChildPayload[]
}

export interface ChildMenuRequestBody {
    menu: ChildMenuFields
    preset_ids: number[]
}

// Union

export type MenuRequestBody = ParentMenuRequestBody | ChildMenuRequestBody

// Type guards

export const isParentMenuRequest = (body: MenuRequestBody): body is ParentMenuRequestBody => {
    return body.menu.parent_id === null
}

export const isChildMenuRequest = (body: MenuRequestBody): body is ChildMenuRequestBody => {
    return body.menu.parent_id !== null
}
