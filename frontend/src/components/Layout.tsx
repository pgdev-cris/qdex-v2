import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from '@/components/Sidebar'

interface LayoutProps {
    children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
    const { token, initializing } = useAuth()

    if (initializing) {
        return null
    }

    if (!token) {
        return <Navigate to="/login" replace />
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
    )
}
