// User
export interface AuthUser {
    auto_id: number
    user_name: string
    user_fname: string
    user_lname: string
    user_mname: string | null
    user_dept: string
    user_role: string
    user_status: string
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
