import { useState, useEffect, useCallback } from 'react'
import {
    Activity,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Eye,
    Printer,
    Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { fmt } from '@/pages/transaction/remittance/helpers'
import { ThermalReceipt } from '@/pages/transaction/remittance/components/ThermalReceipt'
import type { Receipt } from '@/pages/transaction/remittance/types'
import { toTitleCase } from '@/utils/string.utils.ts'
import { OverrideModal } from '@/components/OverrideModal'
import { DatePickerWithRange } from '@/components/ui/date-picker-range.tsx'

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
    verified_by: string | null
    transacted_at: string
    is_overridden: number // 0 | 1
}

interface TransactionDetail {
    tender_type: number
    amount: number
    transaction_count: number
}

interface OverrideLog {
    id: number
    action_id: number
    action_code: string | null
    action_label: string | null
    requester_user_id: number
    requester_name: string | null
    approver_user_id: number
    approver_name: string | null
    remarks: string
    created_at: string
}

interface TransactionWithDetails extends TransactionRow {
    details: TransactionDetail[]
    overrides: OverrideLog[]
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
    3: 'Puregold Wallet',
    4: '(Tangent) Credit Card',
    5: '(Tangent) Debit Card',
    6: 'Home Credit',
    7: 'GCash E-POS',
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

const COLUMNS: { label: string; center?: boolean; right?: boolean }[] = [
    { label: 'Receipt No' },
    { label: 'Supplier' },
    { label: 'Type', center: true },
    { label: 'Total Amount' },
    { label: 'Remitted By' },
    { label: 'Verified By' },
    { label: 'Status', center: true },
    { label: 'Override', center: true },
    { label: 'Date' },
    { label: '', right: true },
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

const OverrideBadge = ({ overridden }: { overridden: boolean }) => {
    if (!overridden) {
        return <span className="text-xs text-muted-foreground">—</span>
    }
    return (
        <span
            className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
            title="Tender amounts were modified from POS values and approved by a supervisor."
        >
            Yes
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
                        <p className="text-xs text-muted-foreground">Verified By</p>
                        <p className="font-medium">
                            {transaction.verified_by
                                ? toTitleCase(transaction.verified_by)
                                : '—'}
                        </p>
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

                {/* Override logs — shown only when the transaction was overridden */}
                {transaction.overrides && transaction.overrides.length > 0 && (
                    <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Override & Remarks
                        </p>
                        <div className="flex flex-col gap-2">
                            {transaction.overrides.map((o) => {
                                // action_label comes from tbl_override_action_status
                                // (REMITTANCE=1 → "Remittance Override",
                                //  VOID=2 → "Void Override").
                                const label = o.action_label ?? 'Override'
                                return (
                                    <div
                                        key={o.id}
                                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                                    >
                                        <div className="mb-1 flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                                {label}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(o.created_at).toLocaleString('en-PH')}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Approved By
                                                </p>
                                                <p className="font-medium">
                                                    {o.approver_name
                                                        ? toTitleCase(o.approver_name)
                                                        : `User #${o.approver_user_id}`}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Requested By
                                                </p>
                                                <p className="font-medium">
                                                    {o.requester_name
                                                        ? toTitleCase(o.requester_name)
                                                        : `User #${o.requester_user_id}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-xs text-muted-foreground">Remarks</p>
                                            <p className="whitespace-pre-wrap break-words">
                                                {o.remarks || '—'}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

//  Main page

const PAGE_LIMIT = 20

export const MonitoringPage = () => {
    const { currentEvent } = useAuth()
    const [rows, setRows] = useState<TransactionRow[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)

    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [dateFrom, setDateFrom] = useState<Date>(new Date())
    const [dateTo, setDateTo] = useState<Date>(new Date())

    const [detail, setDetail] = useState<TransactionWithDetails | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    const [reprintData, setReprintData] = useState<Receipt | null>(null)
    const [reprintLoadingId, setReprintLoadingId] = useState<number | null>(null)

    const [voidingId, setVoidingId] = useState<number | null>(null)
    const [overrideOpen, setOverrideOpen] = useState(false)

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
                if (currentEvent?.id) params.set('event_id', String(currentEvent.id))
                if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
                if (typeFilter) params.set('type', typeFilter)
                if (statusFilter) params.set('status', statusFilter)
                if (dateFrom)
                    params.set('date_from', new Date(dateFrom).toISOString().split('T')[0])
                if (dateTo) params.set('date_to', new Date(dateTo).toISOString().split('T')[0])

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
        [currentEvent?.id, debouncedSearch, typeFilter, statusFilter, dateFrom, dateTo]
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

    const openVoidOverride = (id: number) => {
        setVoidingId(id)
        setOverrideOpen(true)
    }

    const handleVoid = async (approverId: number, remarks: string) => {
        if (!voidingId) return
        setLoading(true)
        try {
            await apiFetch(`/api/v1/remittance/void/${voidingId}`, {
                method: 'POST',
                body: JSON.stringify({
                    override: {
                        approver_user_id: approverId,
                        remarks,
                    },
                }),
            })
            setOverrideOpen(false)
            setVoidingId(null)
            await fetchTransactions(page)
        } catch (err: unknown) {
            console.error('Failed to void transaction:', err)
            alert(err instanceof Error ? err.message : 'Failed to void transaction.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-3 md:p-6">
            {/* Header */}
            <div className="mb-4 md:mb-6 flex items-center justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                        Monitoring
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Remittance transaction log and audit trail.
                        {currentEvent && (
                            <span className="text-primary ml-2 font-medium">
                                {currentEvent.name} ({currentEvent.code})
                            </span>
                        )}
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
                            {/* Search */}
                            <div className="relative w-52">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Supplier, ref code..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            {/* Type */}
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

                            {/* Status */}
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

                            <DatePickerWithRange
                                from={dateFrom}
                                to={dateTo}
                                onSelect={(dateRange) => {
                                    if (dateRange?.from) setDateFrom(dateRange.from)
                                    if (dateRange?.to) setDateTo(dateRange.to)
                                }}
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                    <table
                        className="w-full min-w-[1200px] text-sm"
                        style={{ tableLayout: 'fixed' }}
                    >
                        <colgroup>
                            <col style={{ width: '140px' }} /> {/* Receipt No */}
                            <col style={{ width: '190px' }} /> {/* Supplier */}
                            <col style={{ width: '80px' }} /> {/* Type */}
                            <col style={{ width: '110px' }} /> {/* Total Amount */}
                            <col style={{ width: '130px' }} /> {/* Remitted By */}
                            <col style={{ width: '130px' }} /> {/* Verified By */}
                            <col style={{ width: '90px' }} /> {/* Status */}
                            <col style={{ width: '100px' }} /> {/* Override */}
                            <col style={{ width: '150px' }} /> {/* Date */}
                            <col style={{ width: '110px' }} /> {/* Actions */}
                        </colgroup>
                        <thead>
                            <tr className="border-b">
                                {COLUMNS.map((col) => (
                                    <th
                                        key={col.label}
                                        className={[
                                            'px-2 md:px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground',
                                            col.center
                                                ? 'text-center'
                                                : col.right
                                                  ? 'text-right'
                                                  : 'text-left',
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
                                        {search || typeFilter || statusFilter || dateFrom || dateTo
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
                                        <td className="px-2 md:px-4 py-3">
                                            <p className="font-mono text-xs font-semibold">
                                                {row.receipt_no}
                                            </p>
                                            <p className="font-mono text-xs text-muted-foreground">
                                                {row.reference_code}
                                            </p>
                                        </td>
                                        <td className="overflow-hidden px-2 md:px-4 py-3">
                                            <p
                                                className="truncate font-medium"
                                                title={`${row.supplier_code} - ${row.supplier_name}`}
                                            >
                                                {row.supplier_code} - {row.supplier_name}
                                            </p>
                                        </td>
                                        <td className="px-2 md:px-4 py-3 text-center">
                                            <TypeBadge type={row.type} />
                                        </td>
                                        <td className="px-2 md:px-4 py-3 font-mono">
                                            {fmt(row.total_amount)}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 text-muted-foreground">
                                            {toTitleCase(row.remitted_by)}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 text-muted-foreground">
                                            {row.verified_by ? toTitleCase(row.verified_by) : '—'}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 text-center">
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td className="px-2 md:px-4 py-3 text-center">
                                            <OverrideBadge overridden={row.is_overridden === 1} />
                                        </td>
                                        <td className="px-2 md:px-4 py-3 text-xs text-muted-foreground">
                                            {new Date(row.transacted_at).toLocaleString('en-PH')}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 flex items-center justify-end gap-1">
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
                                            {row.status !== 2 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Void"
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    disabled={loading}
                                                    onClick={() => openVoidOverride(row.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>
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

            <OverrideModal
                open={overrideOpen}
                onClose={() => setOverrideOpen(false)}
                onApproved={handleVoid}
            />

            {/* Print rendering */}
            {reprintData && <ThermalReceipt receipt={reprintData} />}
        </div>
    )
}
