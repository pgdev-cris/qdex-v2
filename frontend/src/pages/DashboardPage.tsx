import { LayoutDashboard, TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

const STATS = [
    { label: 'Total Users', value: '1,284', icon: Users, change: '+12%' },
    { label: 'Revenue', value: '₱2.4M', icon: DollarSign, change: '+8.2%' },
    { label: 'Orders', value: '3,620', icon: ShoppingCart, change: '+5.1%' },
    { label: 'Growth', value: '18.4%', icon: TrendingUp, change: '+2.4%' },
] as const

export function DashboardPage() {
    const { user } = useAuth()

    return (
        <div className="p-6">
            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Dashboard</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Welcome back,{' '}
                    <span className="text-foreground font-medium">
                        {user?.first_name} {user?.last_name}
                    </span>
                </p>
            </div>

            {/* Stat cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {STATS.map(({ label, value, icon: Icon, change }) => (
                    <Card key={label} size="sm">
                        <CardHeader>
                            <CardDescription>{label}</CardDescription>
                            <CardAction>
                                <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950">
                                    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                            </CardAction>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold">{value}</p>
                            <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
                                {change} from last month
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Activity chart placeholder */}
            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                        <LayoutDashboard className="text-muted-foreground h-4 w-4" />
                        Activity Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted flex h-52 items-center justify-center rounded-lg">
                        <p className="text-muted-foreground text-sm">Chart placeholder</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
