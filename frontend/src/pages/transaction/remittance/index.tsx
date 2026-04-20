import { useState, useRef, useEffect } from 'react'
import {
    ArrowLeftRight,
    ScanLine,
    BadgeDollarSign,
    Layers,
    CheckCircle2,
    User,
    Building2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'

import type {
    Step,
    RemitType,
    SalesRecord,
    ReceiptLine,
    Receipt,
    SalesResponse,
    RemittanceApiResponse,
    OverrideApproval,
    PartialSummary,
    PartialSummaryResponse,
    TenderType,
    TenderTypesResponse,
} from './types'
import { SALES_FETCH_PATH } from './constants'
import { fmtReceiptDate, fmt, methodLabel } from './helpers'

import { StepIndicator } from './components/StepIndicator'
import { ThermalReceipt } from './components/ThermalReceipt'
import { SupplierSearch } from './components/SupplierSearch.tsx'
import { SelectType } from './components/SelectType'
import { RemittanceForm } from './components/RemittanceForm'
import { ReceiptPreview } from './components/ReceiptPreview'
import { ConfirmModal } from '@/components/ui/modal'
import type { ConfirmRow } from '@/components/ui/modal'
import { OverrideModal } from '@/components/OverrideModal'

// Context panel

interface ContextPanelProps {
    step: Step
    supplierCode: string
    supplierName: string
    remitterName: string
    remitType: RemitType | null
    salesData: SalesRecord[]
    cashAmount: string
    receipt: Receipt | null
}

const InfoRow = ({ label, value }: { label: string; value: string }) => {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium break-all">{value || '—'}</span>
        </div>
    )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {title}
            </p>
            {children}
        </div>
    )
}

const ContextPanel = ({
    step,
    supplierCode,
    supplierName,
    remitterName,
    remitType,
    salesData,
    cashAmount,
    receipt,
}: ContextPanelProps) => {
    const encodedCash = Number(cashAmount) || 0

    if (step === 'search') {
        return (
            <div className="flex flex-col gap-6">
                <Section title="How it works">
                    <ol className="flex flex-col gap-3">
                        {[
                            {
                                icon: ScanLine,
                                text: 'Aim the handheld scanner at the supplier QR code',
                            },
                            {
                                icon: Building2,
                                text: 'Confirm the supplier and enter the remitter name',
                            },
                            { icon: BadgeDollarSign, text: 'Choose partial or full remittance' },
                            { icon: ArrowLeftRight, text: 'Enter the cash amount and submit' },
                            {
                                icon: CheckCircle2,
                                text: 'Print the receipt for both TRS and supplier',
                            },
                        ].map(({ icon: Icon, text }, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {i + 1}
                                </span>
                                <div className="flex items-start gap-2 pt-0.5">
                                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{text}</span>
                                </div>
                            </li>
                        ))}
                    </ol>
                </Section>
            </div>
        )
    }

    if (step === 'select-type' || step === 'remit') {
        return (
            <div className="flex flex-col gap-6">
                <Section title="Summary">
                    <InfoRow
                        label="Supplier"
                        value={supplierName ? `${supplierCode} - ${supplierName}` : supplierCode}
                    />
                </Section>

                {remitterName && step === 'remit' && (
                    <Section title="Remitter">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium">{remitterName}</span>
                        </div>
                    </Section>
                )}

                {remitType && step === 'remit' && (
                    <Section title="Remittance Type">
                        <div className="flex items-center gap-2">
                            {remitType === 'partial' ? (
                                <BadgeDollarSign className="h-4 w-4 text-primary shrink-0" />
                            ) : (
                                <Layers className="h-4 w-4 text-primary shrink-0" />
                            )}
                            <span className="text-sm font-medium capitalize">{remitType}</span>
                        </div>
                    </Section>
                )}

                {salesData.length > 0 &&
                    (() => {
                        const visibleRows =
                            remitType === 'partial'
                                ? salesData.filter((r) => r.payment_method === 'CASH')
                                : salesData

                        const resolveAmount = (r: SalesRecord) => {
                            if (step === 'remit' && r.payment_method === 'CASH') {
                                return encodedCash
                            }
                            return Number(r.total)
                        }

                        const visibleTotal = visibleRows.reduce((s, r) => s + resolveAmount(r), 0)

                        return (
                            <Section title="Sales">
                                <div className="flex flex-col gap-2">
                                    {visibleRows.map((r) => (
                                        <div
                                            key={r.payment_method}
                                            className="flex justify-between text-sm"
                                        >
                                            <span className="text-muted-foreground">
                                                {methodLabel(r.payment_method)}
                                            </span>
                                            <span className="font-medium tabular-nums">
                                                {fmt(resolveAmount(r))}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="mt-1 flex justify-between border-t pt-2 text-sm font-semibold">
                                        <span>Total</span>
                                        <span className="tabular-nums">{fmt(visibleTotal)}</span>
                                    </div>
                                </div>
                            </Section>
                        )
                    })()}
            </div>
        )
    }

    if (step === 'receipt' && receipt) {
        const total = receipt.lines.reduce((s, l) => s + Number(l.amount), 0)
        return (
            <div className="flex flex-col gap-6">
                <Section title="Transaction Summary">
                    <InfoRow label="Trans No." value={receipt.trans_no} />
                    <InfoRow label="Ref Code" value={receipt.ref_code} />
                    <InfoRow
                        label="Supplier"
                        value={`(${receipt.supplier_code}) ${receipt.supplier_name}`}
                    />
                    <InfoRow label="Remitter" value={receipt.remitter_name} />
                    <InfoRow
                        label="Type"
                        value={receipt.remit_type === 'partial' ? 'Partial' : 'Full'}
                    />
                    <InfoRow label="Verified" value={receipt.verified_at} />
                </Section>
                <Section title="Amount">
                    <div className="flex justify-between text-sm font-semibold">
                        <span>Total Remitted</span>
                        <span className="text-primary tabular-nums">{fmt(total)}</span>
                    </div>
                </Section>
            </div>
        )
    }

    return null
}

// Helpers
const buildReceiptFromApi = (
    apiData: NonNullable<RemittanceApiResponse['data']>,
    remitType: RemitType,
    supplierCode: string,
    supplierName: string,
    remitterName: string,
    printedBy: string,
    eventName: string,
    eventCode: string
): Receipt => {
    return {
        trans_no: apiData.receipt_no,
        ref_code: apiData.reference_code,
        supplier_code: supplierCode,
        supplier_name: supplierName,
        remitter_name: remitterName,
        remit_type: remitType,
        lines: apiData.lines,
        verified_at: fmtReceiptDate(new Date(apiData.remitted_at)),
        gen_at: fmtReceiptDate(new Date()),
        printed_by: printedBy,
        event_name: eventName,
        event_code: eventCode,
        is_voided: false,
    }
}

// Page
export const RemittancePage = () => {
    const { token, user, currentEvent } = useAuth()

    // Wizard state
    const [step, setStep] = useState<Step>('search')
    const [supplierCode, setSupplierCode] = useState('')
    const [supplierName, setSupplierName] = useState('')
    const [supplierInput, setSupplierInput] = useState('')
    const [remitterName, setRemitterName] = useState('')
    const [remitType, setRemitType] = useState<RemitType | null>(null)
    const [salesData, setSalesData] = useState<SalesRecord[]>([])
    const [cashAmount, setCashAmount] = useState('')
    // edited non-CASH amounts keyed by payment_method; seeded with POS values on type select
    const [otherAmounts, setOtherAmounts] = useState<Record<string, string>>({})
    const [receipt, setReceipt] = useState<Receipt | null>(null)

    // Today's partial remittance summary for this supplier (full remittance only)
    const [partialSummary, setPartialSummary] = useState<PartialSummary | null>(null)
    const [partialSummaryLoading, setPartialSummaryLoading] = useState(false)

    // Tender types from DB (loaded once on mount; drives is_editable + sort order)
    const [tenderTypes, setTenderTypes] = useState<TenderType[]>([])

    // Async state
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectError, setSelectError] = useState<string | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const [pendingType, setPendingType] = useState<RemitType | null>(null)

    // Override state
    const [overrideOpen, setOverrideOpen] = useState(false)
    const [overrideApproval, setOverrideApproval] = useState<OverrideApproval | null>(null)

    // Confirm modal
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmRows, setConfirmRows] = useState<ConfirmRow[]>([])

    const inputRef = useRef<HTMLInputElement>(null)
    const cashRecord = salesData.find((r) => r.payment_method === 'CASH')

    const printedBy =
        `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim().toUpperCase() || 'UNKNOWN'
    const eventName = currentEvent?.name ?? ''
    const eventCode = currentEvent?.code ?? ''

    // Load tender types once on mount
    useEffect(() => {
        apiFetch<TenderTypesResponse>('/api/v1/tender-types', { token: token ?? undefined })
            .then((res) => {
                if (res.result === 'success') setTenderTypes(res.data)
            })
            .catch(() => {
                /* non-fatal — fall back to salesData order */
            })
    }, [token])

    // Auto-focus supplier input so handheld scanner fires without a click
    useEffect(() => {
        if (step === 'search') {
            const t = setTimeout(() => inputRef.current?.focus(), 50)
            return () => clearTimeout(t)
        }
    }, [step])

    // Global barcode listener
    useEffect(() => {
        if (step !== 'search') return

        let buffer = ''
        let lastKeyTime = 0
        const SCAN_CHAR_GAP_MS = 50 // max ms between chars for a scan sequence

        const handleGlobalKey = (e: KeyboardEvent) => {
            const now = Date.now()
            const gap = now - lastKeyTime
            lastKeyTime = now

            // If there's a large gap, treat it as the start of a new sequence.
            // Don't reset on Enter so we can still flush a slow-ending scan.
            if (gap > SCAN_CHAR_GAP_MS && e.key !== 'Enter') {
                buffer = ''
            }

            if (e.key === 'Enter') {
                const code = buffer.trim().toUpperCase()
                buffer = ''
                // If Enter came from the supplier input field itself, let that
                // field's own onKeyDown handler call handleSearch — firing here
                // as well would send a second (stale/partial) request.
                if (e.target === inputRef.current) return
                // Require at least 2 characters before triggering an auto-search.
                // A 1-char buffer is almost always a stale artifact from manual
                // typing (the rolling reset leaves only the last key pressed before
                // Enter). Real scanner codes are always multi-character.
                if (code.length >= 2) {
                    setSupplierInput(code)
                    // Trigger search directly with the buffered code so we don't
                    // rely on supplierInput state which may not have updated yet.
                    void handleSearchWithCode(code)
                }
                return
            }

            // Accumulate printable single characters only
            if (e.key.length === 1) {
                buffer += e.key
            }
        }

        window.addEventListener('keydown', handleGlobalKey)
        return () => window.removeEventListener('keydown', handleGlobalKey)
    }, [step])

    // Step 1 — search supplier (accepts an explicit code for the barcode listener path)
    const handleSearchWithCode = async (code: string) => {
        if (!code) return
        setError(null)
        setLoading(true)
        try {
            const json = await apiFetch<SalesResponse>(`${SALES_FETCH_PATH}/${code}`, {
                method: 'GET',
                token: token ?? undefined,
            })
            setSalesData(json.data.sales)
            setSupplierCode(code)
            setSupplierName(json.data.supplier.name ?? '')
            setStep('select-type')
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message: unknown }).message)
                    : null
            setError(msg ?? 'Could not reach the sales service. Check your connection.')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = () => {
        handleSearchWithCode(supplierInput.trim().toUpperCase())
    }

    // Step 2 — select type
    const handleSelectType = async (type: RemitType) => {
        setRemitType(type)
        setSelectError(null)
        setSubmitError(null)
        setOverrideApproval(null)
        setPartialSummary(null)

        if (type === 'partial') {
            setCashAmount('')
            setOtherAmounts({})
            setStep('remit')
        } else {
            // Seed non-CASH amounts from POS
            const others: Record<string, string> = {}
            salesData
                .filter((r) => r.payment_method !== 'CASH')
                .forEach((r) => {
                    others[r.payment_method] = r.total
                })
            setOtherAmounts(others)
            setStep('remit')

            // Fetch today's partial remittances to compute remaining cash balance
            setPartialSummaryLoading(true)
            try {
                const res = await apiFetch<PartialSummaryResponse>(
                    `/api/v1/remittance/partial-summary/${supplierCode}`,
                    { token: token ?? undefined }
                )
                if (res.result === 'success' && res.data) {
                    setPartialSummary(res.data)
                    const posCash = Number(cashRecord?.total ?? 0)
                    const balance = Math.max(0, posCash - res.data.total_cash)
                    // Pre-fill with the remaining balance (zero it out if already fully covered)
                    setCashAmount(balance > 0 ? String(balance) : '0')
                } else {
                    // Fallback: pre-fill with full POS cash if summary unavailable
                    setCashAmount(cashRecord?.total ?? '')
                }
            } catch {
                // Non-fatal — fall back to POS cash total
                setCashAmount(cashRecord?.total ?? '')
            } finally {
                setPartialSummaryLoading(false)
            }
        }
    }

    // Computed cash balance: POS cash minus today's partial remittances
    const computedBalance =
        remitType === 'full'
            ? Math.max(0, Number(cashRecord?.total ?? 0) - (partialSummary?.total_cash ?? 0))
            : Number(cashRecord?.total ?? 0)

    // True when the operator typed a cash amount that differs from the computed balance
    // For full: must match exact balance. For partial: must be <= current cash total.
    const cashOverrideNeeded =
        remitType === 'full'
            ? !partialSummaryLoading && cashAmount !== '' && Number(cashAmount) !== computedBalance
            : cashAmount !== '' && Number(cashAmount) > computedBalance

    // Helpers derived from tenderTypes
    const tenderMap = new Map(tenderTypes.map((t) => [t.code, t]))
    const isEditableTender = (method: string): boolean => {
        if (tenderTypes.length === 0) return method !== 'CASH'
        return (tenderMap.get(method)?.is_editable ?? 0) === 1
    }
    const sortedSales = [...salesData].sort((a, b) => {
        const sortA = tenderMap.get(a.payment_method)?.sort ?? 9999
        const sortB = tenderMap.get(b.payment_method)?.sort ?? 9999
        return sortA - sortB
    })
    const tenderLabel = (method: string) => tenderMap.get(method)?.label ?? methodLabel(method)

    // Determine whether any editable amount was changed from POS value, or cash differs from balance
    const detectOverrideNeeded = (): boolean => {
        if (remitType === 'partial') return cashOverrideNeeded

        const editableChanged = salesData
            .filter((r) => r.payment_method !== 'CASH' && isEditableTender(r.payment_method))
            .some((r) => {
                const edited = otherAmounts[r.payment_method]
                if (edited === undefined) return false
                return Number(edited) !== Number(r.total)
            })
        return editableChanged || cashOverrideNeeded
    }

    // Build confirm rows for the modal
    const buildConfirmRows = (approval: OverrideApproval | null): ConfirmRow[] => {
        const cashVal = Number(cashAmount)
        const supplierLabel = supplierName ? `${supplierCode} - ${supplierName}` : supplierCode

        if (remitType === 'full') {
            return [
                { label: 'Supplier', value: supplierLabel },
                { label: 'Remitter', value: remitterName.trim() || '—' },
                { label: 'Type', value: 'Full Remittance' },
                ...sortedSales.map((r) => {
                    if (r.payment_method === 'CASH') {
                        return {
                            label: tenderLabel(r.payment_method),
                            value: fmt(cashVal),
                            overridden: !!approval && cashOverrideNeeded,
                        }
                    }
                    const editedVal = isEditableTender(r.payment_method)
                        ? Number(otherAmounts[r.payment_method] ?? r.total)
                        : Number(r.total)
                    const wasChanged =
                        isEditableTender(r.payment_method) && editedVal !== Number(r.total)
                    return {
                        label: tenderLabel(r.payment_method),
                        value: fmt(editedVal),
                        overridden: !!approval && wasChanged,
                    }
                }),
            ]
        }

        return [
            { label: 'Supplier', value: supplierLabel },
            { label: 'Remitter', value: remitterName.trim() || '—' },
            { label: 'Type', value: 'Partial Remittance' },
            {
                label: 'Cash to Remit',
                value: fmt(cashVal),
                overridden: !!approval && cashOverrideNeeded,
            },
        ]
    }

    // Step 3 — validate then either open override or confirm modal
    const handleSubmit = () => {
        setSubmitError(null)

        const cashVal = Number(cashAmount)
        // For partial remittance cash must be > 0.
        // For full remittance, 0 is allowed when prior partial remittances already
        // cover the entire cash balance (balance = 0).
        const cashInvalid =
            !cashAmount || isNaN(cashVal) || (remitType === 'partial' ? cashVal <= 0 : cashVal < 0)
        if (cashInvalid) {
            setSubmitError('Please enter a valid cash amount.')
            return
        }

        const needsOverride = detectOverrideNeeded()

        if (needsOverride && !overrideApproval) {
            // Show override modal first; confirm will open after approval
            setOverrideOpen(true)
            return
        }

        // Build confirm rows using current override approval state
        setConfirmRows(buildConfirmRows(overrideApproval))
        setConfirmOpen(true)
    }

    // Called when OverrideModal resolves successfully
    const handleOverrideApproved = (approverId: number, remarks: string) => {
        const approval: OverrideApproval = { approverId, remarks }
        setOverrideApproval(approval)
        setOverrideOpen(false)
        // Immediately open confirm modal with override-tagged rows
        setConfirmRows(buildConfirmRows(approval))
        setConfirmOpen(true)
    }

    // Full remittance — execute after confirmation
    const executeFullRemittance = async () => {
        const lines: ReceiptLine[] = sortedSales.map((r) => {
            if (r.payment_method === 'CASH') {
                return { method: r.payment_method, amount: cashAmount }
            }
            // Only use the edited amount for editable tender types
            const amount = isEditableTender(r.payment_method)
                ? (otherAmounts[r.payment_method] ?? r.total)
                : r.total
            return { method: r.payment_method, amount }
        })

        setConfirmOpen(false)
        setPendingType('full')
        setLoading(true)

        try {
            const body: Record<string, unknown> = {
                supplier_code: supplierCode,
                supplier_name: supplierName,
                remitter_name: remitterName.trim(),
                remit_type: 'full',
                lines,
            }
            if (overrideApproval) {
                body.override = {
                    approver_user_id: overrideApproval.approverId,
                    remarks: overrideApproval.remarks,
                }
            }

            const json = await apiFetch<RemittanceApiResponse>('/api/v1/remittance', {
                method: 'POST',
                body: JSON.stringify(body),
                token: token ?? undefined,
            })

            if (json.result !== 'success' || !json.data) {
                setSelectError(json.message ?? 'Failed to process full remittance.')
                return
            }

            setReceipt(
                buildReceiptFromApi(
                    json.data,
                    'full',
                    supplierCode,
                    supplierName,
                    remitterName.trim(),
                    printedBy,
                    eventName,
                    eventCode
                )
            )
            setStep('receipt')
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message: unknown }).message)
                    : null
            setSelectError(msg ?? 'Could not process remittance. Check your connection.')
        } finally {
            setPendingType(null)
            setLoading(false)
        }
    }

    // Partial remittance — execute after confirmation
    const executePartialRemittance = async () => {
        const lines: ReceiptLine[] = [{ method: 'CASH', amount: cashAmount }]

        setConfirmOpen(false)
        setLoading(true)

        try {
            const body: Record<string, unknown> = {
                supplier_code: supplierCode,
                supplier_name: supplierName,
                remitter_name: remitterName.trim(),
                remit_type: 'partial',
                lines,
            }
            if (overrideApproval) {
                body.override = {
                    approver_user_id: overrideApproval.approverId,
                    remarks: overrideApproval.remarks,
                }
            }

            const json = await apiFetch<RemittanceApiResponse>('/api/v1/remittance/partial', {
                method: 'POST',
                body: JSON.stringify(body),
                token: token ?? undefined,
            })

            if (json.result !== 'success' || !json.data) {
                setSubmitError(json.message ?? 'Failed to process partial remittance.')
                return
            }

            setReceipt(
                buildReceiptFromApi(
                    json.data,
                    'partial',
                    supplierCode,
                    supplierName,
                    remitterName.trim(),
                    printedBy,
                    eventName,
                    eventCode
                )
            )
            setStep('receipt')
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message: unknown }).message)
                    : null
            setSubmitError(msg ?? 'Could not process remittance. Check your connection.')
        } finally {
            setLoading(false)
        }
    }

    // Confirm modal dispatcher
    const handleConfirm = () => {
        if (remitType === 'full') executeFullRemittance()
        else if (remitType === 'partial') executePartialRemittance()
    }

    // Reset
    const handleReset = () => {
        setStep('search')
        setSupplierInput('')
        setSupplierCode('')
        setSupplierName('')
        setRemitterName('')
        setRemitType(null)
        setSalesData([])
        setCashAmount('')
        setOtherAmounts({})
        setReceipt(null)
        setError(null)
        setSelectError(null)
        setSubmitError(null)
        setPendingType(null)
        setConfirmOpen(false)
        setConfirmRows([])
        setOverrideOpen(false)
        setOverrideApproval(null)
        setPartialSummary(null)
        setPartialSummaryLoading(false)
    }

    return (
        <div className="flex min-h-full flex-col p-6">
            {/* Thermal receipt — hidden on screen, prints on 4.25×8.5 in */}
            {receipt && <ThermalReceipt receipt={receipt} />}

            {/* Override approval modal */}
            <OverrideModal
                open={overrideOpen}
                onClose={() => setOverrideOpen(false)}
                onApproved={handleOverrideApproved}
            />

            {/* Remittance confirm modal */}
            <ConfirmModal
                open={confirmOpen}
                title="Confirm Remittance"
                description="Please review the details below before proceeding."
                rows={confirmRows}
                confirmLabel="Process Remittance"
                loading={loading}
                isOverridden={!!overrideApproval}
                overrideRemarks={overrideApproval?.remarks}
                onConfirm={handleConfirm}
                onCancel={() => !loading && setConfirmOpen(false)}
            />

            {/* Page header */}
            <div className="mb-6">
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                    <ArrowLeftRight className="text-muted-foreground h-5 w-5" />
                    Remittance
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Process supplier remittances quickly and accurately.
                </p>
            </div>

            {/* Two-column layout */}
            <div className="flex flex-1 items-start justify-center gap-6">
                {/* Left — wizard */}
                <div className="w-140 shrink-0">
                    <StepIndicator step={step} />

                    {step === 'search' && (
                        <SupplierSearch
                            inputRef={inputRef}
                            supplierInput={supplierInput}
                            loading={loading}
                            error={error}
                            onChange={setSupplierInput}
                            onSearch={handleSearch}
                        />
                    )}

                    {step === 'select-type' && (
                        <SelectType
                            supplierCode={supplierCode}
                            supplierName={supplierName}
                            remitterName={remitterName}
                            loading={loading}
                            selectError={selectError}
                            pendingType={pendingType}
                            onRemitterChange={setRemitterName}
                            onSelectType={handleSelectType}
                            onBack={handleReset}
                        />
                    )}

                    {step === 'remit' && remitType && (
                        <RemittanceForm
                            remitType={remitType}
                            supplierCode={supplierCode}
                            supplierName={supplierName}
                            salesData={salesData}
                            tenderTypes={tenderTypes}
                            cashRecord={cashRecord}
                            cashAmount={cashAmount}
                            otherAmounts={otherAmounts}
                            partialSummary={partialSummary}
                            partialSummaryLoading={partialSummaryLoading}
                            cashOverrideNeeded={cashOverrideNeeded}
                            submitError={submitError}
                            loading={loading}
                            onCashChange={(val) => {
                                setCashAmount(val)
                                // Clear override approval if cash amount changes after approval
                                setOverrideApproval(null)
                            }}
                            onOtherAmountChange={(method, val) => {
                                setOtherAmounts((prev) => ({ ...prev, [method]: val }))
                                // Clear override approval if amounts are changed after approval
                                setOverrideApproval(null)
                            }}
                            onSubmit={handleSubmit}
                            onBack={() => setStep('select-type')}
                        />
                    )}

                    {step === 'receipt' && receipt && (
                        <ReceiptPreview
                            receipt={receipt}
                            onPrint={() => window.print()}
                            onReset={handleReset}
                        />
                    )}
                </div>

                {/* Right — context panel (fixed compact width) */}
                <div className="w-72 shrink-0 rounded-xl border bg-card p-5">
                    <ContextPanel
                        step={step}
                        supplierCode={supplierCode}
                        supplierName={supplierName}
                        remitterName={remitterName}
                        remitType={remitType}
                        salesData={salesData}
                        cashAmount={cashAmount}
                        receipt={receipt}
                    />
                </div>
            </div>
        </div>
    )
}
