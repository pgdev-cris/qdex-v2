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
} from './types'
import { SALES_FETCH_PATH } from './constants'
import { fmtReceiptDate, fmt, methodLabel } from './helpers'

import { StepIndicator } from './components/StepIndicator'
import { ThermalReceipt } from './components/ThermalReceipt'
import { VendorSearch } from './components/VendorSearch'
import { SelectType } from './components/SelectType'
import { RemittanceForm } from './components/RemittanceForm'
import { ReceiptPreview } from './components/ReceiptPreview'
import { ConfirmModal } from '@/components/ui/modal'
import type { ConfirmRow } from '@/components/ui/modal'

// ─── Context panel ────────────────────────────────────────────────────────────

interface ContextPanelProps {
    step: Step
    vendorCode: string
    vendorName: string
    remitterName: string
    remitType: RemitType | null
    salesData: SalesRecord[]
    cashAmount: string
    receipt: Receipt | null
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium break-all">{value || '—'}</span>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {title}
            </p>
            {children}
        </div>
    )
}

function ContextPanel({
    step,
    vendorCode,
    vendorName,
    remitterName,
    remitType,
    salesData,
    cashAmount,
    receipt,
}: ContextPanelProps) {
    const encodedCash = Number(cashAmount) || 0

    if (step === 'search') {
        return (
            <div className="flex flex-col gap-6">
                <Section title="How it works">
                    <ol className="flex flex-col gap-3">
                        {[
                            {
                                icon: ScanLine,
                                text: 'Aim the handheld scanner at the vendor QR code',
                            },
                            {
                                icon: Building2,
                                text: 'Confirm the vendor and enter the remitter name',
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
                <Section title="Remittance Summary">
                    <InfoRow
                        label="Vendor"
                        value={vendorName ? `${vendorCode} - ${vendorName}` : vendorCode}
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

                {salesData.length > 0 && (() => {
                    const visibleRows = remitType === 'partial'
                        ? salesData.filter((r) => r.payment_method === 'CASH')
                        : salesData

                    // On remit step, substitute the typed cash amount for the CASH row
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
                        label="Vendor"
                        value={`(${receipt.vendor_code}) ${receipt.vendor_name}`}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildReceiptFromApi(
    apiData: NonNullable<RemittanceApiResponse['data']>,
    remitType: RemitType,
    vendorCode: string,
    vendorName: string,
    remitterName: string,
    printedBy: string,
    eventName: string,
    eventCode: string,
): Receipt {
    return {
        trans_no: apiData.receipt_no,
        ref_code: apiData.reference_code,
        vendor_code: vendorCode,
        vendor_name: vendorName,
        remitter_name: remitterName,
        remit_type: remitType,
        lines: apiData.lines,
        verified_at: fmtReceiptDate(new Date(apiData.remitted_at)),
        gen_at: fmtReceiptDate(new Date()),
        printed_by: printedBy,
        event_name: eventName,
        event_code: eventCode,
    }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RemittancePage() {
    const { token, user, currentEvent } = useAuth()

    // ── Wizard state ──────────────────────────────────────────────────────────
    const [step, setStep] = useState<Step>('search')
    const [vendorCode, setVendorCode] = useState('')
    const [vendorName, setVendorName] = useState('')
    const [vendorInput, setVendorInput] = useState('')
    const [remitterName, setRemitterName] = useState('')
    const [remitType, setRemitType] = useState<RemitType | null>(null)
    const [salesData, setSalesData] = useState<SalesRecord[]>([])
    const [cashAmount, setCashAmount] = useState('')
    const [receipt, setReceipt] = useState<Receipt | null>(null)

    // ── Async state ───────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectError, setSelectError] = useState<string | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)

    /** Which type button is currently in a pending API call */
    const [pendingType, setPendingType] = useState<RemitType | null>(null)

    // ── Confirm modal ─────────────────────────────────────────────────────────
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmRows, setConfirmRows] = useState<ConfirmRow[]>([])

    const inputRef = useRef<HTMLInputElement>(null)
    const cashRecord = salesData.find((r) => r.payment_method === 'CASH')

    const printedBy =
        `${user?.user_fname ?? ''} ${user?.user_lname ?? ''}`.trim().toUpperCase() || 'UNKNOWN'
    const eventName = currentEvent?.name ?? ''
    const eventCode = currentEvent?.code ?? ''

    // Auto-focus vendor input so handheld scanner fires without a click
    useEffect(() => {
        if (step === 'search') {
            const t = setTimeout(() => inputRef.current?.focus(), 50)
            return () => clearTimeout(t)
        }
    }, [step])

    // ── Step 1 — search vendor ────────────────────────────────────────────────
    async function handleSearch() {
        const code = vendorInput.trim().toUpperCase()
        if (!code) return
        setError(null)
        setLoading(true)
        try {
            const json = await apiFetch<SalesResponse>(`${SALES_FETCH_PATH}/${code}`, {
                method: 'GET',
                token: token ?? undefined,
            })
            setSalesData(json.data.sales)
            setVendorCode(code)
            setVendorName(json.data.vendor.name ?? '')
            setStep('select-type')
        } catch (err: unknown) {
            console.error('Error fetching sales data:', err)
            const msg =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message: unknown }).message)
                    : null
            setError(msg ?? 'Could not reach the sales service. Check your connection.')
        } finally {
            setLoading(false)
        }
    }

    // ── Step 2 — select type ──────────────────────────────────────────────────
    // • Partial → go to remit form
    // • Full    → show confirm modal first, then execute on approval
    function handleSelectType(type: RemitType) {
        setRemitType(type)
        setSelectError(null)

        if (type === 'partial') {
            setCashAmount('')
            setStep('remit')
            return
        }

        // Full remittance: build summary rows and open confirm modal
        const cashTotal = cashRecord?.total ?? '0'
        setCashAmount(cashTotal)

        const rows: ConfirmRow[] = [
            {
                label: 'Vendor',
                value: vendorName ? `${vendorCode} - ${vendorName}` : vendorCode,
            },
            { label: 'Remitter', value: remitterName.trim() || '—' },
            { label: 'Type', value: 'Full Remittance' },
            ...salesData.map((r) => ({
                label: methodLabel(r.payment_method),
                value: fmt(r.payment_method === 'CASH' ? cashTotal : r.total),
            })),
        ]
        setConfirmRows(rows)
        setConfirmOpen(true)
    }

    // ── Full remittance — execute after confirmation ───────────────────────────
    async function executeFullRemittance() {
        const cashTotal = cashRecord?.total ?? '0'
        const lines: ReceiptLine[] = salesData.map((r) =>
            r.payment_method === 'CASH'
                ? { method: r.payment_method, amount: cashTotal }
                : { method: r.payment_method, amount: r.total }
        )

        setConfirmOpen(false)
        setPendingType('full')
        setLoading(true)

        try {
            const json = await apiFetch<RemittanceApiResponse>('/api/v1/remittance', {
                method: 'POST',
                body: JSON.stringify({
                    vendor_code: vendorCode,
                    vendor_name: vendorName,
                    remitter_name: remitterName.trim(),
                    remit_type: 'full',
                    lines,
                }),
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
                    vendorCode,
                    vendorName,
                    remitterName.trim(),
                    printedBy,
                    eventName,
                    eventCode,
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

    // ── Step 3 — submit partial: validate then open confirm modal ─────────────
    function handleSubmit() {
        setSubmitError(null)

        const cashVal = Number(cashAmount)
        if (!cashAmount || isNaN(cashVal) || cashVal <= 0) {
            setSubmitError('Please enter a valid cash amount.')
            return
        }

        const rows: ConfirmRow[] = [
            {
                label: 'Vendor',
                value: vendorName ? `${vendorCode} - ${vendorName}` : vendorCode,
            },
            { label: 'Remitter', value: remitterName.trim() || '—' },
            { label: 'Type', value: 'Partial Remittance' },
            { label: 'Cash to Remit', value: fmt(cashVal) },
        ]
        setConfirmRows(rows)
        setConfirmOpen(true)
    }

    // ── Partial remittance — execute after confirmation ────────────────────────
    async function executePartialRemittance() {
        const lines: ReceiptLine[] = [{ method: 'CASH', amount: cashAmount }]

        setConfirmOpen(false)
        setLoading(true)

        try {
            const json = await apiFetch<RemittanceApiResponse>('/api/v1/remittance/partial', {
                method: 'POST',
                body: JSON.stringify({
                    vendor_code: vendorCode,
                    vendor_name: vendorName,
                    remitter_name: remitterName.trim(),
                    remit_type: 'partial',
                    lines,
                }),
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
                    vendorCode,
                    vendorName,
                    remitterName.trim(),
                    printedBy,
                    eventName,
                    eventCode,
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

    // ── Confirm modal dispatcher ──────────────────────────────────────────────
    function handleConfirm() {
        if (remitType === 'full') executeFullRemittance()
        else if (remitType === 'partial') executePartialRemittance()
    }

    // ── Reset ─────────────────────────────────────────────────────────────────
    function handleReset() {
        setStep('search')
        setVendorInput('')
        setVendorCode('')
        setVendorName('')
        setRemitterName('')
        setRemitType(null)
        setSalesData([])
        setCashAmount('')
        setReceipt(null)
        setError(null)
        setSelectError(null)
        setSubmitError(null)
        setPendingType(null)
        setConfirmOpen(false)
        setConfirmRows([])
    }

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="flex min-h-full flex-col p-6">
            {/* Thermal receipt — hidden on screen, prints on 4.25×8.5 in */}
            {receipt && <ThermalReceipt receipt={receipt} />}

            {/* Remittance confirm modal */}
            <ConfirmModal
                open={confirmOpen}
                title="Confirm Remittance"
                description="Please review the details below before proceeding."
                rows={confirmRows}
                confirmLabel="Process Remittance"
                loading={loading}
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
                    Process vendor remittances quickly and accurately.
                </p>
            </div>

            {/* Two-column layout */}
            <div className="flex flex-1 items-start justify-center gap-6">
                {/* Left — wizard */}
                <div className="w-140 shrink-0">
                    <StepIndicator step={step} />

                    {step === 'search' && (
                        <VendorSearch
                            inputRef={inputRef}
                            vendorInput={vendorInput}
                            loading={loading}
                            error={error}
                            onChange={setVendorInput}
                            onSearch={handleSearch}
                        />
                    )}

                    {step === 'select-type' && (
                        <SelectType
                            vendorCode={vendorCode}
                            vendorName={vendorName}
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
                            vendorCode={vendorCode}
                            vendorName={vendorName}
                            salesData={salesData}
                            cashRecord={cashRecord}
                            cashAmount={cashAmount}
                            submitError={submitError}
                            loading={loading}
                            onCashChange={setCashAmount}
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
                        vendorCode={vendorCode}
                        vendorName={vendorName}
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
