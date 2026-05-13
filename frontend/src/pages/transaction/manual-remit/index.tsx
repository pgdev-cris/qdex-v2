import { useState, useEffect, useRef, useCallback } from 'react'
import {
    ClipboardEdit,
    Search,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/modal'
import type { ConfirmRow } from '@/components/ui/modal'
import { ThermalReceipt } from '@/pages/transaction/remittance/components/ThermalReceipt'
import { ReceiptPreview } from '@/pages/transaction/remittance/components/ReceiptPreview'
import type { Receipt, TenderType, TenderTypesResponse, RemittanceApiResponse } from '@/pages/transaction/remittance/types'
import { fmt, fmtReceiptDate } from '@/pages/transaction/remittance/helpers'
import { tenderLabelByCode } from '@/constants/tender.constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
    id: number
    code: number
    name: string
    status: number
}

interface SuppliersResponse {
    status: number
    message: string
    data: Supplier[]
}

interface TenderRow {
    id: string        // local key for React
    method: string    // tender code e.g. 'CASH'
    amount: string
}

// ─── Supplier Combobox ────────────────────────────────────────────────────────

interface SupplierComboboxProps {
    suppliers: Supplier[]
    value: Supplier | null
    onChange: (s: Supplier | null) => void
    disabled?: boolean
}

const SupplierCombobox = ({ suppliers, value, onChange, disabled }: SupplierComboboxProps) => {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Sync display query when value changes externally
    useEffect(() => {
        if (!value) setQuery('')
    }, [value])

    // When a supplier is already selected the input shows the full label string,
    // which won't match any supplier — use an empty filter so all entries show.
    const filterQuery = value ? '' : query.trim()
    const filtered = filterQuery
        ? suppliers.filter(
              (s) =>
                  String(s.code).includes(filterQuery) ||
                  s.name.toLowerCase().includes(filterQuery.toLowerCase())
          )
        : suppliers

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleSelect = (s: Supplier) => {
        onChange(s)
        setQuery(`${s.code} — ${s.name}`)
        setOpen(false)
    }

    const handleClear = () => {
        onChange(null)
        setQuery('')
    }

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    className="pl-8 pr-8"
                    placeholder="Type supplier code or name…"
                    value={value ? `${value.code} — ${value.name}` : query}
                    onChange={(e) => {
                        if (value) onChange(null)   // clear selection on re-type
                        setQuery(e.target.value)
                        setOpen(true)
                    }}
                    onFocus={() => setOpen(true)}
                    disabled={disabled}
                />
                {(value || query) && !disabled && (
                    <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={handleClear}
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-popover shadow-md">
                    {filtered.slice(0, 50).map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent text-left"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(s)}
                        >
                            <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">
                                {s.code}
                            </span>
                            <span className="truncate">{s.name}</span>
                        </button>
                    ))}
                    {filtered.length > 50 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground italic">
                            {filtered.length - 50} more — refine your search
                        </div>
                    )}
                </div>
            )}

            {open && query.trim() && filtered.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md px-3 py-3 text-sm text-muted-foreground">
                    No suppliers matched "{query}"
                </div>
            )}
        </div>
    )
}

// ─── Tender Row ───────────────────────────────────────────────────────────────

interface TenderRowInputProps {
    row: TenderRow
    tenderTypes: TenderType[]
    usedMethods: string[]
    onChange: (id: string, field: 'method' | 'amount', val: string) => void
    onRemove: (id: string) => void
    canRemove: boolean
    disabled?: boolean
}

const TenderRowInput = ({
    row,
    tenderTypes,
    usedMethods,
    onChange,
    onRemove,
    canRemove,
    disabled,
}: TenderRowInputProps) => {
    const availableMethods = tenderTypes.filter(
        (t) => t.code === row.method || !usedMethods.includes(t.code)
    )

    return (
        <div className="flex items-center gap-2">
            {/* Method selector */}
            <div className="relative w-44 shrink-0">
                <select
                    className="w-full appearance-none rounded-md border bg-background px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    value={row.method}
                    onChange={(e) => onChange(row.id, 'method', e.target.value)}
                    disabled={disabled}
                >
                    <option value="">— Select —</option>
                    {availableMethods.map((t) => (
                        <option key={t.code} value={t.code}>
                            {t.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Amount */}
            <Input
                className="flex-1 tabular-nums"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={row.amount}
                onChange={(e) => onChange(row.id, 'amount', e.target.value)}
                disabled={disabled}
            />

            {/* Remove */}
            {canRemove && (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(row.id)}
                    disabled={disabled}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildReceiptFromApi = (
    apiData: NonNullable<RemittanceApiResponse['data']>,
    supplierCode: string,
    supplierName: string,
    remitterName: string,
    printedBy: string,
    eventName: string,
    eventCode: string
): Receipt => ({
    trans_no: apiData.receipt_no,
    ref_code: apiData.reference_code,
    supplier_code: supplierCode,
    supplier_name: supplierName,
    remitter_name: remitterName,
    remit_type: 'manual',
    lines: apiData.lines,
    verified_at: fmtReceiptDate(new Date(apiData.remitted_at)),
    gen_at: fmtReceiptDate(new Date()),
    printed_by: printedBy,
    event_name: eventName,
    event_code: eventCode,
    is_voided: false,
    is_prev_sales_only: false,
})

let _nextId = 1
const nextId = () => String(_nextId++)

// ─── Context panel ────────────────────────────────────────────────────────────
// Defined outside ManualRemitPage so React never unmounts/remounts it on re-renders.

interface ContextPanelProps {
    receipt: Receipt | null
    selectedSupplier: { code: number; name: string } | null
    totalAmount: number
    tenderRows: TenderRow[]
}

const ContextPanel = ({ receipt, selectedSupplier, totalAmount, tenderRows }: ContextPanelProps) => {
    if (receipt) {
        const total = receipt.lines.reduce((s, l) => s + Number(l.amount), 0)
        return (
            <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Transaction Summary</p>
                <InfoRow label="Trans No." value={receipt.trans_no} />
                <InfoRow label="Ref Code" value={receipt.ref_code} />
                <InfoRow label="Supplier" value={`(${receipt.supplier_code}) ${receipt.supplier_name}`} />
                <InfoRow label="Remitter" value={receipt.remitter_name} />
                <InfoRow label="Type" value="Manual" />
                <div className="mt-1 flex justify-between text-sm font-semibold">
                    <span>Total Remitted</span>
                    <span className="text-primary tabular-nums">{fmt(total)}</span>
                </div>
            </div>
        )
    }

    if (selectedSupplier || tenderRows.some((r) => Number(r.amount) > 0)) {
        return (
            <div className="flex flex-col gap-6">
                {selectedSupplier && (
                    <div className="flex flex-col gap-3">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Supplier</p>
                        <InfoRow label="Code" value={String(selectedSupplier.code)} />
                        <InfoRow label="Name" value={selectedSupplier.name} />
                    </div>
                )}
                {totalAmount > 0 && (
                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Tenders</p>
                        {tenderRows
                            .filter((r) => r.method && Number(r.amount) > 0)
                            .map((r) => (
                                <div key={r.id} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {tenderLabelByCode(r.method) || r.method}
                                    </span>
                                    <span className="font-medium tabular-nums">
                                        {fmt(Number(r.amount))}
                                    </span>
                                </div>
                            ))}
                        <div className="mt-1 flex justify-between border-t pt-2 text-sm font-semibold">
                            <span>Total</span>
                            <span className="tabular-nums">{fmt(totalAmount)}</span>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">How it works</p>
            <ol className="flex flex-col gap-3">
                {[
                    'Search and select a supplier by code or name',
                    "Enter the remitter's name",
                    'Add cash and/or other tender amounts',
                    'Review the summary and confirm to post',
                    'Print the receipt for TRS and supplier',
                ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {i + 1}
                        </span>
                        <span className="text-sm text-muted-foreground pt-0.5">{text}</span>
                    </li>
                ))}
            </ol>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const ManualRemitPage = () => {
    const { token, user, currentEvent } = useAuth()

    // Suppliers master list
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [suppliersLoading, setSuppliersLoading] = useState(true)

    // Tender types
    const [tenderTypes, setTenderTypes] = useState<TenderType[]>([])

    // Form state
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
    const [remitterName, setRemitterName] = useState('')
    const [tenderRows, setTenderRows] = useState<TenderRow[]>([
        { id: nextId(), method: 'CASH', amount: '' },
    ])

    // UI state
    const [loading, setLoading] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmRows, setConfirmRows] = useState<ConfirmRow[]>([])
    const [receipt, setReceipt] = useState<Receipt | null>(null)

    // Reset confirmation
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

    const printedBy =
        `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim().toUpperCase() || 'UNKNOWN'
    const eventName = currentEvent?.name ?? ''
    const eventCode = currentEvent?.code ?? ''

    // Load suppliers + tender types on mount
    useEffect(() => {
        Promise.all([
            apiFetch<SuppliersResponse>('/api/v1/suppliers', { token: token ?? undefined }),
            apiFetch<TenderTypesResponse>('/api/v1/tender-types', { token: token ?? undefined }),
        ])
            .then(([suppRes, tenderRes]) => {
                if (suppRes.data)
                    setSuppliers(suppRes.data.map((s) => ({ ...s, name: s.name.trim() })))
                if (tenderRes.result === 'success') setTenderTypes(tenderRes.data)
            })
            .catch(() => {/* non-fatal */})
            .finally(() => setSuppliersLoading(false))
    }, [token])

    // Tender row helpers
    const usedMethods = tenderRows.map((r) => r.method).filter(Boolean)

    const handleTenderChange = useCallback(
        (id: string, field: 'method' | 'amount', val: string) => {
            setTenderRows((prev) =>
                prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
            )
            setSubmitError(null)
        },
        []
    )

    const handleTenderRemove = useCallback((id: string) => {
        setTenderRows((prev) => prev.filter((r) => r.id !== id))
    }, [])

    const handleAddTender = () => {
        const next = tenderTypes.find((t) => !usedMethods.includes(t.code))
        setTenderRows((prev) => [
            ...prev,
            { id: nextId(), method: next?.code ?? '', amount: '' },
        ])
    }

    const availableToAdd = tenderTypes.filter((t) => !usedMethods.includes(t.code))

    // Validation + open confirm modal
    const handleSubmit = () => {
        setSubmitError(null)

        if (!currentEvent) {
            setSubmitError('No active event. Please activate an event before processing.')
            return
        }

        if (!selectedSupplier) {
            setSubmitError('Please select a supplier.')
            return
        }

        if (!remitterName.trim()) {
            setSubmitError('Please enter the remitter name.')
            return
        }

        // Rows with an amount entered but no method chosen
        const incompleteRows = tenderRows.filter((r) => !r.method && Number(r.amount) > 0)
        if (incompleteRows.length > 0) {
            setSubmitError('One or more rows have an amount but no payment method selected.')
            return
        }

        const validRows = tenderRows.filter((r) => r.method && Number(r.amount) > 0)

        if (validRows.length === 0) {
            setSubmitError('Please enter at least one tender amount greater than zero.')
            return
        }

        if (tenderRows.some((r) => r.method && (isNaN(Number(r.amount)) || Number(r.amount) < 0))) {
            setSubmitError('All amounts must be valid positive numbers.')
            return
        }

        const effectiveName = selectedSupplier.name
        const supplierLabel = `${selectedSupplier.code} — ${effectiveName}`
        const rows: ConfirmRow[] = [
            { label: 'Supplier', value: supplierLabel },
            { label: 'Remitter', value: remitterName.trim() },
            { label: 'Type', value: 'Manual Remittance' },
            ...validRows.map((r) => ({
                label: tenderLabelByCode(r.method) || r.method,
                value: fmt(Number(r.amount)),
            })),
        ]

        setConfirmRows(rows)
        setConfirmOpen(true)
    }

    // Execute after confirm
    const handleConfirm = async () => {
        if (!selectedSupplier) return
        setLoading(true)

        const lines = tenderRows
            .filter((r) => r.method && Number(r.amount) > 0)
            .map((r) => ({ method: r.method, amount: r.amount }))

        const effectiveName = selectedSupplier.name

        try {
            const json = await apiFetch<RemittanceApiResponse>('/api/v1/remittance/manual', {
                method: 'POST',
                body: JSON.stringify({
                    supplier_code: String(selectedSupplier.code),
                    supplier_name: effectiveName,
                    remitter_name: remitterName.trim(),
                    remit_type: 'full',
                    lines,
                }),
                token: token ?? undefined,
            })

            if (json.result !== 'success' || !json.data) {
                setSubmitError(json.message ?? 'Failed to process manual remittance.')
                setConfirmOpen(false)
                return
            }

            setReceipt(
                buildReceiptFromApi(
                    json.data,
                    String(selectedSupplier.code),
                    effectiveName,
                    remitterName.trim(),
                    printedBy,
                    eventName,
                    eventCode
                )
            )
            setConfirmOpen(false)
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message: unknown }).message)
                    : null
            setSubmitError(msg ?? 'Could not process remittance. Check your connection.')
            setConfirmOpen(false)
        } finally {
            setLoading(false)
        }
    }

    // Reset the whole form
    const handleReset = () => {
        setSelectedSupplier(null)
        setRemitterName('')
        setTenderRows([{ id: nextId(), method: 'CASH', amount: '' }])
        setSubmitError(null)
        setConfirmOpen(false)
        setConfirmRows([])
        setReceipt(null)
        setResetConfirmOpen(false)
    }

    const totalAmount = tenderRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex min-h-full flex-col p-6">
            {/* Thermal receipt — hidden on screen, prints on 4.25×8.5 in */}
            {receipt && <ThermalReceipt receipt={receipt} />}

            {/* Confirm modal */}
            <ConfirmModal
                open={confirmOpen}
                title="Confirm Manual Remittance"
                description="Please review the details below before posting."
                rows={confirmRows}
                confirmLabel="Post Remittance"
                loading={loading}
                onConfirm={handleConfirm}
                onCancel={() => !loading && setConfirmOpen(false)}
            />

            {/* Reset confirm */}
            {resetConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-80 rounded-xl border bg-card p-6 shadow-xl flex flex-col gap-4">
                        <div>
                            <p className="font-semibold text-base">Reset Form?</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                This will clear all entered data. This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setResetConfirmOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" className="flex-1" onClick={handleReset}>
                                Reset
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page header */}
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <ClipboardEdit className="h-5 w-5 text-muted-foreground" />
                        Manual Remittance
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manually post a remittance for a supplier without POS sales data.
                    </p>
                </div>
                {!receipt && (selectedSupplier || remitterName || tenderRows.some((r) => Number(r.amount) > 0)) && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setResetConfirmOpen(true)}
                        disabled={loading}
                    >
                        Reset Form
                    </Button>
                )}
            </div>

            {/* Two-column layout */}
            <div className="flex flex-1 items-start justify-center gap-6">
                {/* Left — form or receipt */}
                <div className="w-160 shrink-0">
                    {!receipt ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ClipboardEdit className="h-4 w-4" />
                                    Remittance Details
                                </CardTitle>
                                <CardDescription>
                                    Fill in all fields, then review and confirm to post.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex flex-col gap-6">
                                {/* Supplier search */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">Supplier Code / Search</label>
                                    <SupplierCombobox
                                        suppliers={suppliers}
                                        value={selectedSupplier}
                                        onChange={(s) => {
                                            setSelectedSupplier(s)
                                            setSubmitError(null)
                                        }}
                                        disabled={loading || suppliersLoading}
                                    />
                                    {suppliersLoading && (
                                        <p className="text-xs text-muted-foreground">Loading suppliers…</p>
                                    )}
                                </div>

                                {/* Remitter name */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">Remitter Name</label>
                                    <Input
                                        placeholder="Enter remitter name…"
                                        value={remitterName}
                                        onChange={(e) => {
                                            setRemitterName(e.target.value)
                                            setSubmitError(null)
                                        }}
                                        disabled={loading}
                                    />
                                </div>

                                {/* Tender rows */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">Tenders &amp; Amounts</label>
                                        <span className="text-xs text-muted-foreground">
                                            {tenderRows.length} row{tenderRows.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {/* Column headers */}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-0.5">
                                        <span className="w-44 shrink-0">Payment Method</span>
                                        <span className="flex-1">Amount (₱)</span>
                                        <span className="w-7 shrink-0" />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {tenderRows.map((row) => (
                                            <TenderRowInput
                                                key={row.id}
                                                row={row}
                                                tenderTypes={tenderTypes}
                                                usedMethods={usedMethods}
                                                onChange={handleTenderChange}
                                                onRemove={handleTenderRemove}
                                                canRemove={tenderRows.length > 1}
                                                disabled={loading}
                                            />
                                        ))}
                                    </div>

                                    {availableToAdd.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full gap-1.5"
                                            onClick={handleAddTender}
                                            disabled={loading}
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Tender
                                        </Button>
                                    )}

                                    {/* Running total */}
                                    {totalAmount > 0 && (
                                        <div className="flex justify-between rounded-lg bg-muted/50 px-4 py-2.5 text-sm font-semibold">
                                            <span>Total</span>
                                            <span className="tabular-nums text-primary">{fmt(totalAmount)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Error */}
                                {submitError && (
                                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {submitError}
                                    </p>
                                )}

                                {/* Submit */}
                                <Button
                                    className="w-full"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Review &amp; Post
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <ReceiptPreview
                            receipt={receipt}
                            onPrint={() => window.print()}
                            onReset={() => setResetConfirmOpen(true)}
                        />
                    )}
                </div>

                {/* Right — context panel */}
                <div className="w-72 shrink-0">
                    <div className="rounded-xl border bg-card p-5">
                        <ContextPanel
                            receipt={receipt}
                            selectedSupplier={selectedSupplier}
                            totalAmount={totalAmount}
                            tenderRows={tenderRows}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Small helpers (defined after component to avoid hoisting issues) ─────────

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium break-all">{value || '—'}</span>
    </div>
)
