import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    ClipboardCheck,
    Search,
    RefreshCw,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DatePicker } from '@/components/ui/date-picker'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

const toISO = (d: Date | undefined) => (d ? format(d, 'yyyy-MM-dd') : '')

// ─── Types ────────────────────────────────────────────────────────────────────

type RemittanceStatus = 'settled' | 'partial' | 'pending' | 'no_activity'

interface RemittanceStatusRow {
    supplier_id: number
    supplier_code: number
    supplier_name: string
    total_sales: number
    total_remitted: number
    balance: number
    transaction_count: number
    status: RemittanceStatus
}

interface RemittanceStatusSummary {
    total_suppliers: number
    settled: number
    partial: number
    pending: number
    no_activity: number
}

interface RemittanceStatusReport {
    rows: RemittanceStatusRow[]
    summary: RemittanceStatusSummary
}

interface ApiResponse {
    result: string
    data: RemittanceStatusReport
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortKey = keyof Pick<
    RemittanceStatusRow,
    'supplier_code' | 'supplier_name' | 'total_sales' | 'total_remitted' | 'balance' | 'status'
>
type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<RemittanceStatus, number> = {
    pending: 0,
    partial: 1,
    settled: 2,
    no_activity: 3,
}

const compareRows = (
    a: RemittanceStatusRow,
    b: RemittanceStatusRow,
    key: SortKey,
    dir: SortDir
): number => {
    let cmp = 0
    if (key === 'status') {
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    } else if (key === 'supplier_name') {
        cmp = a.supplier_name.localeCompare(b.supplier_name)
    } else {
        cmp = Number(a[key]) - Number(b[key])
    }
    return dir === 'asc' ? cmp : -cmp
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RemittanceStatus, { label: string; className: string }> = {
    settled: { label: 'Settled', className: 'bg-green-50 text-green-700 border-green-200' },
    partial: { label: 'Partial', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    pending: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    no_activity: {
        label: 'No Activity',
        className: 'bg-muted text-muted-foreground border-border',
    },
}

const StatusBadge = ({ status }: { status: RemittanceStatus }) => {
    const cfg = STATUS_CONFIG[status]
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}
        >
            {cfg.label}
        </span>
    )
}

// ─── Summary cards ────────────────────────────────────────────────────────────

interface SummaryCardProps {
    label: string
    count: number
    color: string
}

const SummaryCard = ({ label, count, color }: SummaryCardProps) => (
    <Card className="flex-1 min-w-[120px]">
        <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{count}</p>
        </CardContent>
    </Card>
)

// ─── Sort icon ────────────────────────────────────────────────────────────────

const SortIcon = ({
    columnKey,
    sortKey,
    sortDir,
}: {
    columnKey: SortKey
    sortKey: SortKey
    sortDir: SortDir
}) => {
    if (sortKey !== columnKey) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
    return sortDir === 'asc' ? (
        <ChevronUp className="h-3.5 w-3.5 text-primary" />
    ) : (
        <ChevronDown className="h-3.5 w-3.5 text-primary" />
    )
}

// ─── Currency formatter ───────────────────────────────────────────────────────

const fmt = (val: number) =>
    Number(val).toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    })

// ─── Page ─────────────────────────────────────────────────────────────────────

export const RemittanceStatusPage = () => {
    const { token, currentEvent } = useAuth()

    const [rows, setRows] = useState<RemittanceStatusRow[]>([])
    const [summary, setSummary] = useState<RemittanceStatusSummary | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Filters — single date (sent as both `from` and `to` to the backend)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // Sort
    const [sortKey, setSortKey] = useState<SortKey>('supplier_code')
    const [sortDir, setSortDir] = useState<SortDir>('asc')

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350)
        return () => clearTimeout(t)
    }, [search])

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (currentEvent?.id) params.set('event_id', String(currentEvent.id))
            const isoDate = toISO(selectedDate)
            if (isoDate) {
                params.set('from', isoDate)
                params.set('to', isoDate)
            }
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())

            const res = await apiFetch<ApiResponse>(
                `/api/v1/reports/remittance-status?${params.toString()}`,
                { token: token ?? undefined }
            )
            setRows(res.data.rows)
            setSummary(res.data.summary)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load remittance status.')
        } finally {
            setLoading(false)
        }
    }, [currentEvent?.id, selectedDate, debouncedSearch, token])

    useEffect(() => {
        void fetchData()
    }, [fetchData])

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }

    const sorted = useMemo(
        () => [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDir)),
        [rows, sortKey, sortDir]
    )

    const thClass =
        'px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground select-none'
    const thBtn = (key: SortKey, label: string, right = false) => (
        <th className={thClass + (right ? ' text-right' : '')}>
            <button
                onClick={() => handleSort(key)}
                className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${right ? 'flex-row-reverse' : ''}`}
            >
                {label}
                <SortIcon columnKey={key} sortKey={sortKey} sortDir={sortDir} />
            </button>
        </th>
    )

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                        Remittance Status
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Supplier remittance compliance and balance overview.
                        {currentEvent && (
                            <span className="text-primary ml-2 font-medium">
                                {currentEvent.name} ({currentEvent.code})
                            </span>
                        )}
                    </p>
                </div>
                <Button variant="outline" onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Summary cards */}
            {summary && (
                <div className="mb-6 flex flex-wrap gap-3">
                    <SummaryCard
                        label="Total Suppliers"
                        count={summary.total_suppliers}
                        color="text-foreground"
                    />
                    <SummaryCard label="Settled" count={summary.settled} color="text-green-600" />
                    <SummaryCard label="Partial" count={summary.partial} color="text-amber-600" />
                    <SummaryCard label="Pending" count={summary.pending} color="text-yellow-600" />
                    <SummaryCard
                        label="No Activity"
                        count={summary.no_activity}
                        color="text-muted-foreground"
                    />
                </div>
            )}

            {/* Table card */}
            <Card>
                <CardHeader className="border-b">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle>Supplier Overview</CardTitle>
                            <CardDescription>
                                {rows.length} {rows.length === 1 ? 'supplier' : 'suppliers'} found
                                {selectedDate && (
                                    <span className="ml-1">
                                        for {format(selectedDate, 'MMM d, yyyy')}
                                    </span>
                                )}
                            </CardDescription>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-52">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Supplier name or code…"
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <DatePicker
                                value={selectedDate}
                                onSelect={(date) => {
                                    if (date) setSelectedDate(date)
                                }}
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {error ? (
                        <div className="px-4 py-10 text-center text-sm text-destructive">
                            {error}
                        </div>
                    ) : (
                        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                            <colgroup>
                                <col style={{ width: '90px' }} />
                                <col />
                                <col style={{ width: '150px' }} />
                                <col style={{ width: '150px' }} />
                                <col style={{ width: '140px' }} />
                                <col style={{ width: '120px' }} />
                            </colgroup>
                            <thead>
                                <tr className="border-b">
                                    {thBtn('supplier_code', 'Code')}
                                    {thBtn('supplier_name', 'Supplier')}
                                    {thBtn('total_sales', 'Total Sales', true)}
                                    {thBtn('total_remitted', 'Total Remitted', true)}
                                    {thBtn('balance', 'Balance', true)}
                                    {thBtn('status', 'Status')}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-16 text-center text-sm text-muted-foreground"
                                        >
                                            Loading…
                                        </td>
                                    </tr>
                                ) : sorted.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-16 text-center text-sm text-muted-foreground"
                                        >
                                            No suppliers found.
                                        </td>
                                    </tr>
                                ) : (
                                    sorted.map((row) => {
                                        const balanceNegative = Number(row.balance) < 0
                                        return (
                                            <tr
                                                key={row.supplier_id}
                                                className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                                            >
                                                <td className="px-4 py-3 font-mono text-xs font-medium text-muted-foreground">
                                                    {row.supplier_code}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p
                                                        className="font-medium truncate"
                                                        title={row.supplier_name}
                                                    >
                                                        {row.supplier_name}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums">
                                                    {row.total_sales > 0 ? (
                                                        fmt(row.total_sales)
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums">
                                                    {row.total_remitted > 0 ? (
                                                        fmt(row.total_remitted)
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 text-right tabular-nums font-medium ${
                                                        balanceNegative
                                                            ? 'text-destructive'
                                                            : row.balance > 0
                                                              ? 'text-amber-600'
                                                              : 'text-green-600'
                                                    }`}
                                                >
                                                    {row.total_sales > 0 ||
                                                    row.total_remitted > 0 ? (
                                                        fmt(row.balance)
                                                    ) : (
                                                        <span className="text-muted-foreground font-normal">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={row.status} />
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </CardContent>

                {/* Footer totals */}
                {!loading &&
                    sorted.length > 0 &&
                    (() => {
                        const totSales = sorted.reduce((s, r) => s + Number(r.total_sales), 0)
                        const totRemitted = sorted.reduce((s, r) => s + Number(r.total_remitted), 0)
                        const totBalance = sorted.reduce((s, r) => s + Number(r.balance), 0)
                        return (
                            <>
                                <Separator />
                                <div className="flex items-center justify-end gap-0">
                                    {/* Spacer columns matching Code + Supplier Name */}
                                    <div className="flex-1 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Totals ({sorted.length} suppliers)
                                    </div>
                                    <div className="w-[150px] px-4 py-3 text-right tabular-nums text-sm font-semibold">
                                        {fmt(totSales)}
                                    </div>
                                    <div className="w-[150px] px-4 py-3 text-right tabular-nums text-sm font-semibold">
                                        {fmt(totRemitted)}
                                    </div>
                                    <div
                                        className={`w-[140px] px-4 py-3 text-right tabular-nums text-sm font-semibold ${
                                            totBalance < 0
                                                ? 'text-destructive'
                                                : totBalance > 0
                                                  ? 'text-amber-600'
                                                  : 'text-green-600'
                                        }`}
                                    >
                                        {fmt(totBalance)}
                                    </div>
                                    <div className="w-[120px]" />
                                </div>
                            </>
                        )
                    })()}
            </Card>
        </div>
    )
}
