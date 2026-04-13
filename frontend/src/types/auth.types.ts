// User
export interface AuthUser {
    id: number
    username: string
    first_name: string
    last_name: string
    middle_name: string | null
    department: string
    role: string
    status: number
}

// Event
export interface AppEvent {
    id: number
    name: string
    code: string
    period_start: string | null
    period_end: string | null
    status: 0 | 1 // 0 = inactive, 1 = active
}

// Menu tree
export interface MenuTreeNode {
    id: number
    parent_id: number | null
    name: string
    url: string | null
    icon: string | null
    sort: number
    target: string | null
    is_active: 0 | 1
    created_at: string | null
    target_modal: string | null
    children: MenuTreeNode[]
}

export interface MenuPreset {
    id: number
    name: string
    menus: MenuTreeNode[]
}

// API responses
export interface LoginResponse {
    message: string
    data: AuthUser & {
        token: string
        menu: MenuPreset | null
        currentEvent: AppEvent | null
    }
}
