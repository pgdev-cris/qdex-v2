import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Home,
    FileText,
    Settings,
    Users,
    BarChart2,
    ShoppingCart,
    Package,
    Layers,
    ChevronDown,
    ChevronRight,
    LogOut,
    AlertTriangle,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import type { MenuTreeNode } from '@/types/auth.types'
import { toTitleCase } from '@/utils/string.utils.ts'

//  Icon map (string from DB → lucide component)

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    home: Home,
    dashboard: LayoutDashboard,
    document: FileText,
    reports: BarChart2,
    settings: Settings,
    users: Users,
    cart: ShoppingCart,
    package: Package,
    layers: Layers,
}

function MenuIcon({ name, className }: { name: string | null; className?: string }) {
    const Icon = name ? ICON_MAP[name.toLowerCase()] : null
    return Icon ? (
        <Icon className={cn('h-4 w-4 shrink-0', className)} />
    ) : (
        <span className={cn('h-4 w-4 shrink-0', className)} />
    )
}

//  Shared class helpers

const navItemBase =
    'w-full justify-start gap-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
const navItemActive =
    'bg-sidebar-primary/10 font-medium text-sidebar-primary hover:bg-sidebar-primary/10 hover:text-sidebar-primary'
const navItemChild = 'text-sidebar-foreground/50'

//  Single sidebar item (recursive)

function SidebarItem({ node, depth = 0 }: { node: MenuTreeNode; depth?: number }) {
    const [open, setOpen] = useState(true)
    const hasChildren = node.children.length > 0

    // Parent with children — collapsible group
    if (hasChildren) {
        return (
            <div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen((o) => !o)}
                    className={cn(navItemBase)}
                >
                    <MenuIcon name={node.icon} />
                    <span className="flex-1 text-left">{node.name}</span>
                    {open ? (
                        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                    )}
                </Button>

                {open && (
                    <div className="ml-4.5 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
                        {node.children.map((child: MenuTreeNode) => (
                            <SidebarItem key={child.id} node={child} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // Navigable leaf — NavLink styled via buttonVariants
    if (node.url) {
        return (
            <NavLink
                to={node.url}
                className={({ isActive }) =>
                    cn(
                        buttonVariants({ variant: 'ghost', size: 'sm' }),
                        navItemBase,
                        depth > 0 && navItemChild,
                        isActive && navItemActive
                    )
                }
            >
                <MenuIcon name={node.icon} />
                <span>{node.name}</span>
            </NavLink>
        )
    }

    // Modal-target leaf — placeholder for modal integration
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => console.log('[Sidebar] open modal:', node.target_modal)}
            className={cn(navItemBase, depth > 0 && navItemChild)}
        >
            <MenuIcon name={node.icon} />
            <span className="text-left">{node.name}</span>
        </Button>
    )
}

//  Logout confirmation modal

function LogoutModal({
    open,
    onConfirm,
    onCancel,
}: {
    open: boolean
    onConfirm: () => void
    onCancel: () => void
}) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Panel */}
            <div
                className="relative z-10 w-80 rounded-xl border bg-card p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex flex-col items-center gap-3 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-card-foreground">Sign out?</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            You'll need to log back in to continue.
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={onConfirm}>
                        Sign out
                    </Button>
                </div>
            </div>
        </div>
    )
}

//  Sidebar shell

export function Sidebar() {
    const { user, menu, currentEvent, logout } = useAuth()
    const navigate = useNavigate()
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    const handleLogoutConfirm = () => {
        setShowLogoutConfirm(false)
        logout()
        navigate('/login', { replace: true })
    }

    return (
        <>
            <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
                {/* Brand header */}
                <div className="flex items-center gap-2.5 px-4 py-4">
                    <img src="/pg_logo.png" alt="PG Logo" className="size-6" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">QDEX</p>
                        <p className="truncate text-xs text-sidebar-foreground/50">
                            {menu?.name ?? 'Dashboard'}
                        </p>
                    </div>
                </div>

                <Separator className="bg-sidebar-border" />

                {/* Current event */}
                <div className="px-4 py-3">
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/40">
                        Current Event
                    </p>
                    {currentEvent ? (
                        <div className="flex items-center gap-2">
                            <span className="mt-px h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <p className="truncate text-xs font-medium text-sidebar-foreground/80">
                                {currentEvent.name}
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-sidebar-foreground/35 italic">None set</p>
                    )}
                </div>

                <Separator className="bg-sidebar-border" />

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-2 py-3">
                    <div className="flex flex-col gap-0.5">
                        {menu?.menus?.map((node: MenuTreeNode) => (
                            <SidebarItem key={node.id} node={node} />
                        ))}
                    </div>
                </nav>

                <Separator className="bg-sidebar-border" />

                {/* User footer */}
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                            {toTitleCase(user?.first_name)} {toTitleCase(user?.last_name)}
                        </p>
                        <p className="truncate text-xs text-sidebar-foreground/50">
                            {user?.role.toUpperCase()}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowLogoutConfirm(true)}
                        title="Sign out"
                        className="shrink-0 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </aside>

            <LogoutModal
                open={showLogoutConfirm}
                onConfirm={handleLogoutConfirm}
                onCancel={() => setShowLogoutConfirm(false)}
            />
        </>
    )
}
