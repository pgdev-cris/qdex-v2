import { useState, useEffect, useCallback } from 'react'
import { Activity, Search, RefreshCw, ChevronLeft, ChevronRight, Eye, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { apiFetch } from '@/lib/api'
import { fmt } from '@/pages/transaction/remittance/helpers'
import { ThermalReceipt } from '@/pages/transaction/remittance/components/ThermalReceipt'
import type { Receipt } from '@/pages/transaction/remittance/types'
import { toTitleCase } from '@/utils/string.utils.ts'

//  Types

interface TransactionRow {
    id: number
    receipt_no: string
    reference_code: string
    supplier_code: number
    supplier_name: string
    event_name: string
    type: number
    status: number
    total_amount: number
    remitted_by: string
    transacted_at: string
}

interface TransactionDetail {
    tender_type: number
    amount: number
    transaction_count: number
}

interface TransactionWithDetails extends TransactionRow {
    details: TransactionDetail[]
}

interface ListResponse {
    result: string
    data: TransactionRow[]
    total: number
    page: number
    limit: number
    pages: number
}

interface DetailResponse {
    result: string
    data: TransactionWithDetails
}

//  Constants

const TYPE_LABEL: Record<number, string> = { 1: 'Partial', 2: 'Full' }
const STATUS_LABEL: Record<number, string> = { 0: 'Pending', 1: 'Verified', 2: 'Voided' }
const TENDER_LABEL: Record<number, string> = {
    1: 'Cash',
    2: 'GCash',
    3: 'PayWallet',
    4: 'Credit Card',
    5: 'Debit Card',
    6: 'Home Credit',
}

const TYPE_OPTIONS = [
    { value: '', label: 'All Types' },
    { value: '1', label: 'Partial' },
    { value: '2', label: 'Full' },
]

const STATUS_OPTIONS = [
    { value: '', label: 'All Status' },
    { value: '0', label: 'Pending' },
    { value: '1', label: 'Verified' },
    { value: '2', label: 'Voided' },
]

const COLUMNS: { label: string; center?: boolean }[] = [
    { label: 'Receipt No' },
    { label: 'Supplier' },
    { label: 'Type', center: true },
    { label: 'Total Amount' },
    { label: 'Remitted By' },
    { label: 'Status', center: true },
    { label: 'Date' },
    { label: '' },
]

//  Badges

const TypeBadge = ({ type }: { type: number }) => {
    const isPartial = type === 1
    return (
        <span
            className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                isPartial ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700',
            ].join(' ')}
        >
            {TYPE_LABEL[type] ?? type}
        </span>
    )
}

const StatusBadge = ({ status }: { status: number }) => {
    const colors: Record<number, string> = {
        0: 'bg-yellow-50 text-yellow-700',
        1: 'bg-green-50 text-green-700',
        2: 'bg-red-50 text-red-700',
    }
    return (
        <span
            className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                colors[status] ?? 'bg-muted text-muted-foreground',
            ].join(' ')}
        >
            {STATUS_LABEL[status] ?? status}
        </span>
    )
}

//  Detail modal

//  Detail modal
const TransactionDetailModal = ({
    open,
    transaction,
    onClose,
    onReprint,
    reprinting,
}: {
    open: boolean
    transaction: TransactionWithDetails | null
    onClose: () => void
    onReprint: (id: number) => void
    reprinting: boolean
}) => {
    if (!transaction) return null

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Transaction ${transaction.receipt_no}`}
            description={`Ref: ${transaction.reference_code}`}
            size="md"
            footer={
                <div className="flex w-full items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReprint(transaction.id)}
                        disabled={reprinting}
                    >
                        <Printer
                            className={['mr-2 h-4 w-4', reprinting ? 'animate-pulse' : ''].join(
                                ' '
                            )}
                        />
                        {reprinting ? 'Reprinting...' : 'Reprint Receipt'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Close
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col gap-5">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                        <p className="text-xs text-muted-foreground">Supplier</p>
                        <p className="font-medium">
                            {transaction.supplier_code} - {transaction.supplier_name}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Event</p>
                        <p className="font-medium">{transaction.event_name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <TypeBadge type={transaction.type} />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <StatusBadge status={transaction.status} />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Remitted By</p>
                        <p className="font-medium">{toTitleCase(transaction.remitted_by)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium">
                            {new Date(transaction.transacted_at).toLocaleString('en-PH')}
                        </p>
                    </div>
                </div>

                {/* Payment lines */}
                <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Payment Breakdown
                    </p>
                    <div className="rounded-lg border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                                        Method
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {transaction.details.map((d, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                        <td className="px-3 py-2">
                                            {TENDER_LABEL[d.tender_type] ?? `Type ${d.tender_type}`}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            {fmt(d.amount)}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-muted/30">
                                    <td className="px-3 py-2 text-xs font-semibold">Total</td>
                                    <td className="px-3 py-2 text-right font-mono font-semibold">
                                        {fmt(transaction.total_amount)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

//  Main page

const PAGE_LIMIT = 20

export const MonitoringPage = () => {
    const [rows, setRows] = useState<TransactionRow[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)

    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const [detail, setDetail] = useState<TransactionWithDetails | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    const [reprintData, setReprintData] = useState<Receipt | null>(null)
    const [reprintLoadingId, setReprintLoadingId] = useState<number | null>(null)

    // Debounce: wait 400 ms after the last keystroke before triggering a fetch
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400)
        return () => clearTimeout(t)
    }, [search])

    const fetchTransactions = useCallback(
        async (p = 1) => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                params.set('page', String(p))
                params.set('limit', String(PAGE_LIMIT))
                if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
                if (typeFilter) params.set('type', typeFilter)
                if (statusFilter) params.set('status', statusFilter)

                const res = await apiFetch<ListResponse>(
                    `/api/v1/monitoring?${params.toString()}`,
                    { method: 'GET' }
                )

                setRows(res.data)
                setTotal(res.total)
                setPage(res.page)
                setPages(res.pages)
            } catch (err) {
                console.error('Failed to fetch transactions:', err)
            } finally {
                setLoading(false)
            }
        },
        [debouncedSearch, typeFilter, statusFilter]
    )

    useEffect(() => {
        void fetchTransactions(1)
    }, [fetchTransactions])

    const openDetail = async (id: number) => {
        setDetailLoading(true)
        try {
            const res = await apiFetch<DetailResponse>(`/api/v1/monitoring/${id}`, {
                method: 'GET',
            })
            setDetail(res.data)
        } catch (err) {
            console.error('Failed to fetch transaction detail:', err)
        } finally {
            setDetailLoading(false)
        }
    }

    const handleReprint = async (id: number) => {
        setReprintLoadingId(id)
        try {
            const res = await apiFetch<{ result: string; data: Receipt }>(
                `/api/v1/monitoring/${id}/reprint`,
                { method: 'GET' }
            )
            setReprintData(res.data)
            // Wait for state update and DOM render
            setTimeout(() => {
                window.print()
            }, 100)
        } catch (err) {
            console.error('Failed to reprint transaction:', err)
            alert('Failed to generate reprint data.')
        } finally {
            setReprintLoadingId(null)
        }
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                        Monitoring
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Remittance transaction log and audit trail.
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => fetchTransactions(page)}
                    disabled={loading}
                >
                    <RefreshCw className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')} />
                    Refresh
                </Button>
            </div>

            {/* Table card */}
            <Card>
                <CardHeader className="border-b">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle>Transaction Log</CardTitle>
                            <CardDescription>
                                {total} {total === 1 ? 'transaction' : 'transactions'} found.
                            </CardDescription>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-56">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Supplier, ref code..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                {TYPE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                {STATUS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '154px' }} /> {/* Receipt No */}
                            <col style={{ width: '200px' }} /> {/* Supplier */}
                            <col style={{ width: '90px' }} /> {/* Type */}
                            <col style={{ width: '120px' }} /> {/* Total Amount */}
                            <col style={{ width: '140px' }} /> {/* Remitted By */}
                            <col style={{ width: '100px' }} /> {/* Status */}
                            <col style={{ width: '160px' }} /> {/* Date */}
                            <col style={{ width: '76px' }} /> {/* Actions */}
                        </colgroup>
                        <thead>
                            <tr className="border-b">
                                {COLUMNS.map((col) => (
                                    <th
                                        key={col.label}
                                        className={[
                                            'px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground',
                                            col.center ? 'text-center' : 'text-left',
                                        ].join(' ')}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={COLUMNS.length}
                                        className="py-16 text-center text-sm text-muted-foreground"
                                    >
                                        Loading...
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={COLUMNS.length}
                                        className="py-16 text-center text-sm text-muted-foreground"
                                    >
                                        {search || typeFilter || statusFilter
                                            ? 'No transactions match your filters.'
                                            : 'No transactions recorded yet.'}
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b last:border-0 hover:bg-muted/40"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-mono text-xs font-semibold">
                                                {row.receipt_no}
                                            </p>
                                            <p className="font-mono text-xs text-muted-foreground">
                                                {row.reference_code}
                                            </p>
                                        </td>
                                        <td className="overflow-hidden px-4 py-3">
                                            <p
                                                className="truncate font-medium"
                                                title={`${row.supplier_code} - ${row.supplier_name}`}
                                            >
                                                {row.supplier_code} - {row.supplier_name}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <TypeBadge type={row.type} />
                                        </td>
                                        <td className="px-4 py-3 font-mono">
                                            {fmt(row.total_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {toTitleCase(row.remitted_by)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {new Date(row.transacted_at).toLocaleString('en-PH')}
                                        </td>
                                        <td className="px-4 py-3 flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="View details"
                                                disabled={detailLoading}
                                                onClick={() => openDetail(row.id)}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="Reprint"
                                                disabled={reprintLoadingId !== null}
                                                onClick={() => handleReprint(row.id)}
                                            >
                                                <Printer
                                                    className={[
                                                        'h-3.5 w-3.5',
                                                        reprintLoadingId === row.id
                                                            ? 'animate-pulse'
                                                            : '',
                                                    ].join(' ')}
                                                />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>

                {/* Pagination */}
                {pages > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            Page {page} of {pages} &middot; {total} total
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon-sm"
                                disabled={page <= 1 || loading}
                                onClick={() => fetchTransactions(page - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon-sm"
                                disabled={page >= pages || loading}
                                onClick={() => fetchTransactions(page + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Detail modal */}
            <TransactionDetailModal
                open={detail !== null}
                transaction={detail}
                onClose={() => setDetail(null)}
                onReprint={handleReprint}
                reprinting={reprintLoadingId === detail?.id}
            />

            {/* Print rendering */}
            {reprintData && <ThermalReceipt receipt={reprintData} />}
        </div>
    )
}
