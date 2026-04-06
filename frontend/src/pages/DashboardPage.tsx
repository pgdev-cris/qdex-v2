import { useState, useEffect, useMemo } from 'react'
import { LayoutDashboard, PhilippinePeso, ShoppingCart, ReceiptText } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { getDashboardStats } from '@/services/dashboard.service'
import type { DashboardStats } from '@/types/dashboard.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'

const activityChartConfig = {
    count: {
        label: 'Remittances',
        color: 'var(--primary)',
    },
} satisfies ChartConfig

const tenderChartConfig = {
    amount: {
        label: 'Amount',
    },
    CASH: {
        label: 'Cash',
        theme: {
            light: 'oklch(0.648 0.2 131.684)',
            dark: 'oklch(0.768 0.233 130.85)',
        },
    },
    GCASH: {
        label: 'GCash',
        color: 'var(--chart-2)',
    },
    PWALLET: {
        label: 'Puregold Wallet',
        color: 'var(--chart-3)',
    },
    TANGENT_DEBIT: {
        label: '(Tangent) Credit Card',
        color: 'var(--chart-4)',
    },
    TANGENT_CREDIT: {
        label: '(Tangent) Debit Card',
        color: 'var(--chart-5)',
    },
    HOMECREDIT: {
        label: 'Home Credit',
        color: 'oklch(0.7 0.15 30)',
    },
    GCASH_EPOS: {
        label: 'GCash E-POS',
        color: 'oklch(0.65 0.18 250)',
    },
} satisfies ChartConfig

export const DashboardPage = () => {
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
            icon: PhilippinePeso,
            color: 'emerald',
        },
        {
            label: 'Total Remittances (Today)',
            value: stats ? stats.total_remittances_today.toLocaleString() : '...',
            icon: ShoppingCart,
            color: 'blue',
        },
    ]

    const tenderChartData = useMemo(() => {
        if (!stats?.sales_by_tender) return []
        return stats.sales_by_tender.map((item) => {
            return {
                ...item,
                fill: `var(--color-${item.tender_type})`,
            }
        })
    }, [stats?.sales_by_tender])

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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="flex flex-col gap-6">
                    {/* Stat cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {statCards.map(({ label, value, icon: Icon, color }) => (
                            <Card key={label} size="sm" className="relative overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <CardDescription className="text-xs font-medium uppercase tracking-wider">
                                        {label}
                                    </CardDescription>
                                    <div
                                        className={`rounded-full p-2 ${
                                            color === 'emerald'
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-2xl font-bold tracking-tight">{value}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="flex flex-1 flex-col">
                        <CardHeader className="border-b pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <ReceiptText className="text-muted-foreground h-4 w-4" />
                                Sales by Tender
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 pt-6">
                            {loading ? (
                                <p className="text-muted-foreground text-sm">Loading...</p>
                            ) : stats?.sales_by_tender.length ? (
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        {stats.sales_by_tender.map((item) => (
                                            <div
                                                key={item.tender_type}
                                                className="flex items-center justify-between border-b border-muted pb-2 last:border-0"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-2 w-2 rounded-full"
                                                        style={{
                                                            backgroundColor: `var(--color-${item.tender_type})`,
                                                        }}
                                                    />
                                                    <span className="text-muted-foreground text-sm">
                                                        {item.tender_type}
                                                    </span>
                                                </div>
                                                <span className="font-medium text-sm">
                                                    ₱{item.amount.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <ChartContainer
                                            config={tenderChartConfig}
                                            className="aspect-square max-h-50 w-full"
                                        >
                                            <PieChart>
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={<ChartTooltipContent hideLabel />}
                                                />
                                                <Pie
                                                    data={tenderChartData}
                                                    dataKey="amount"
                                                    nameKey="tender_type"
                                                    innerRadius={60}
                                                    strokeWidth={5}
                                                />
                                            </PieChart>
                                        </ChartContainer>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    No sales data available
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Activity Overview (Remittances per Hour) */}
                <Card className="flex flex-col">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <LayoutDashboard className="text-muted-foreground h-4 w-4" />
                            Hourly Activity (Today)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 pt-6">
                        {loading ? (
                            <p className="text-muted-foreground text-sm">Loading...</p>
                        ) : stats?.remittances_per_hour.length ? (
                            <ChartContainer
                                config={activityChartConfig}
                                className="h-full min-h-75 w-full"
                            >
                                <BarChart
                                    accessibilityLayer
                                    data={stats.remittances_per_hour}
                                    margin={{ top: 20, right: 12, left: -20, bottom: 0 }}
                                >
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="hour"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        allowDecimals={false}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="var(--color-count)"
                                        radius={4}
                                        minPointSize={2}
                                    />
                                </BarChart>
                            </ChartContainer>
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
