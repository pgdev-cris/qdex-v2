import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser, LoginResponse, MenuPreset, AppEvent } from '@/types/auth.types'
import { apiFetch } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredAuth {
    user: AuthUser
    token: string
    menu: MenuPreset | null
    currentEvent: AppEvent | null
}

interface AuthContextType {
    user: AuthUser | null
    token: string | null
    menu: MenuPreset | null
    currentEvent: AppEvent | null
    initializing: boolean
    loading: boolean
    login: (username: string, password: string) => Promise<void>
    logout: () => void
    setCurrentEvent: (event: AppEvent | null) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'qdex_auth'

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [menu, setMenu] = useState<MenuPreset | null>(null)
    const [currentEvent, setCurrentEventState] = useState<AppEvent | null>(null)
    const [initializing, setInitializing] = useState(true)
    const [loading, setLoading] = useState(false)

    // Restore session from localStorage on mount
    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            try {
                const stored: StoredAuth = JSON.parse(raw)
                setUser(stored.user)
                setToken(stored.token)
                setMenu(stored.menu)
                setCurrentEventState(stored.currentEvent ?? null)
            } catch {
                localStorage.removeItem(STORAGE_KEY)
            }
        }
        setInitializing(false)
    }, [])

    const login = useCallback(async (username: string, password: string) => {
        setLoading(true)
        try {
            const res = await apiFetch<LoginResponse>('/api/v1/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            })

            const { token, menu, currentEvent, ...user } = res.data

            const stored: StoredAuth = { user, token, menu, currentEvent }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

            setUser(user)
            setToken(token)
            setMenu(menu)
            setCurrentEventState(currentEvent)
        } finally {
            setLoading(false)
        }
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY)
        setUser(null)
        setToken(null)
        setMenu(null)
        setCurrentEventState(null)
    }, [])

    // Expose a setter so EventsPage can update the app-level event after activation
    const setCurrentEvent = useCallback((event: AppEvent | null) => {
        setCurrentEventState(event)
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            try {
                const stored: StoredAuth = JSON.parse(raw)
                stored.currentEvent = event
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
            } catch { /* ignore */ }
        }
    }, [])

    return (
        <AuthContext.Provider
            value={{ user, token, menu, currentEvent, initializing, loading, login, logout, setCurrentEvent }}
        >
            {children}
        </AuthContext.Provider>
    )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
    return ctx
}
