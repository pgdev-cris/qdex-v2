import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, ShoppingCart, DollarSign, ReceiptText } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getDashboardStats } from '@/services/dashboard.service'
import type { DashboardStats } from '@/types/dashboard.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardPage() {
    const { user } = useAuth()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getDashboardStats()
                setStats(data)
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    const statCards = [
        {
            label: 'Total Sales (Today)',
            value: stats ? `₱${stats.total_sales_today.toLocaleString()}` : '...',
            icon: DollarSign,
            color: 'blue',
        },
        {
            label: 'Total Remittances (Today)',
            value: stats ? stats.total_remittances_today.toLocaleString() : '...',
            icon: ShoppingCart,
            color: 'green',
        },
    ]

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
                {statCards.map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} size="sm">
                        <CardHeader>
                            <CardDescription>{label}</CardDescription>
                            <div
                                className={`rounded-lg p-2 ${
                                    color === 'blue'
                                        ? 'bg-blue-50 dark:bg-blue-950'
                                        : 'bg-green-50 dark:bg-green-950'
                                }`}
                            >
                                <Icon
                                    className={`h-4 w-4 ${
                                        color === 'blue'
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-green-600 dark:text-green-400'
                                    }`}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold">{value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Sales by Tender Type */}
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <ReceiptText className="text-muted-foreground h-4 w-4" />
                            Sales by Tender
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {loading ? (
                            <p className="text-muted-foreground text-sm">Loading...</p>
                        ) : stats?.sales_by_tender.length ? (
                            <div className="space-y-4">
                                {stats.sales_by_tender.map((item) => (
                                    <div
                                        key={item.tender_type}
                                        className="flex items-center justify-between"
                                    >
                                        <span className="text-muted-foreground text-sm">
                                            {item.tender_type}
                                        </span>
                                        <span className="font-medium">
                                            ₱{item.amount.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">No sales data available</p>
                        )}
                    </CardContent>
                </Card>

                {/* Activity Overview (Remittances per Hour) */}
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <LayoutDashboard className="text-muted-foreground h-4 w-4" />
                            Hourly Activity (Today)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {loading ? (
                            <p className="text-muted-foreground text-sm">Loading...</p>
                        ) : stats?.remittances_per_hour.length ? (
                            <div className="flex h-52 items-end justify-between gap-1 pt-4">
                                {(() => {
                                    const maxCount = Math.max(
                                        ...stats.remittances_per_hour.map((h) => h.count),
                                        1
                                    )
                                    return stats.remittances_per_hour.map((item) => {
                                        const height = (item.count / maxCount) * 100
                                        return (
                                            <div
                                                key={item.hour}
                                                className="group relative flex h-full flex-1 flex-col items-center justify-end"
                                            >
                                                <div
                                                    className={`w-full rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-500 ${
                                                        item.count > 0
                                                            ? 'bg-blue-500 dark:bg-blue-600'
                                                            : 'bg-muted/50 dark:bg-muted/20'
                                                    }`}
                                                    style={{ height: `${Math.max(height, 2)}%` }}
                                                >
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 scale-0 rounded bg-gray-800 px-2 py-1 text-[10px] text-white transition-all group-hover:scale-100 z-10">
                                                        {item.count}
                                                    </div>
                                                </div>
                                                <span className="mt-2 text-[8px] text-gray-500">
                                                    {item.hour}
                                                </span>
                                            </div>
                                        )
                                    })
                                })()}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                No activity data available
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
