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
import { Button } from '@/components/ui/button'

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
    receipt: Receipt | null
    tenderTypes: TenderType[]
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
    receipt,
    tenderTypes,
}: ContextPanelProps) => {
    const ctxTenderMap = new Map(tenderTypes.map((t) => [t.code, t]))
    const ctxIsEditable = (method: string): boolean => {
        if (tenderTypes.length === 0) return method !== 'CASH'
        return (ctxTenderMap.get(method)?.is_editable ?? 0) === 1
    }

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
                        const ctxIsPartiable = (method: string): boolean => {
                            if (tenderTypes.length === 0) return true
                            return (ctxTenderMap.get(method)?.is_partiable ?? 0) === 1
                        }
                        const visibleRows =
                            remitType === 'partial'
                                ? salesData.filter(
                                      (r) =>
                                          (r.payment_method === 'CASH' && ctxIsPartiable('CASH')) ||
                                          (r.payment_method !== 'CASH' && ctxIsEditable(r.payment_method) && ctxIsPartiable(r.payment_method))
                                  )
                                : salesData

                        const resolveAmount = (r: SalesRecord) => Number(r.total)

                        const visibleTotal = visibleRows.reduce((s, r) => s + resolveAmount(r), 0)

                        return (
                            <Section title="Today's Sales">
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

    // Previous day's unremitted sales (shown when vendor has no full remittance yesterday)
    const [prevSales, setPrevSales] = useState<SalesRecord[] | null>(null)
    const [prevDate, setPrevDate] = useState<string | null>(null)
    const [prevSalesPromptOpen, setPrevSalesPromptOpen] = useState(false)
    const [includePrevSales, setIncludePrevSales] = useState(false)
    /** Per-tender amounts already partially remitted on prev_date — used for breakdown display */
    const [prevPartialDeductions, setPrevPartialDeductions] = useState<Record<string, number> | null>(null)

    // Tender types from DB (loaded once on mount; drives is_editable + sort order)
    const [tenderTypes, setTenderTypes] = useState<TenderType[]>([])

    // Async state
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectError, setSelectError] = useState<string | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const [pendingType, setPendingType] = useState<RemitType | null>(null)
    const [salesRefreshing, setSalesRefreshing] = useState(false)

    // Override state — main remittance (amount overrides)
    const [overrideOpen, setOverrideOpen] = useState(false)
    const [overrideApproval, setOverrideApproval] = useState<OverrideApproval | null>(null)

    // Override state — skip previous unremitted sales
    const [skipPrevOverrideOpen, setSkipPrevOverrideOpen] = useState(false)
    const [skipPrevSalesOverride, setSkipPrevSalesOverride] = useState<OverrideApproval | null>(null)

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
            setPrevSales(json.data.prev_sales ?? null)
            setPrevDate(json.data.prev_date ?? null)
            setPrevPartialDeductions(json.data.prev_partial_deductions ?? null)
            setStep('select-type')
        } catch (err: unknown) {
            const errObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : {}

            // Explicit block: vendor already has a full remittance today
            if (errObj.result === 'already_remitted') {
                setError(String(errObj.message ?? 'Vendor already fully remitted today.'))
                return
            }

            const msg = 'message' in errObj ? String(errObj.message) : null
            setError(msg ?? 'Could not reach the sales service. Check your connection.')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = () => {
        handleSearchWithCode(supplierInput.trim().toUpperCase())
    }

    // Refresh sales data while on the remit step (in case POS was adjusted)
    const handleRefreshSales = async () => {
        if (!supplierCode) return
        setSalesRefreshing(true)
        setSubmitError(null)
        try {
            // Fetch POS sales and partial summary in parallel
            const [salesJson, summaryRes] = await Promise.all([
                apiFetch<SalesResponse>(`${SALES_FETCH_PATH}/${supplierCode}`, {
                    method: 'GET',
                    token: token ?? undefined,
                }),
                remitType === 'full'
                    ? apiFetch<PartialSummaryResponse>(
                          `/api/v1/remittance/partial-summary/${supplierCode}`,
                          { token: token ?? undefined }
                      ).catch(() => null)
                    : Promise.resolve(null),
            ])

            const freshSales = salesJson.data.sales
            setSalesData(freshSales)

            // Refresh previous day's sales from the same response
            const freshPrevSales = salesJson.data.prev_sales ?? null
            const freshPrevDate = salesJson.data.prev_date ?? null
            const freshPrevPartialDeductions = salesJson.data.prev_partial_deductions ?? null
            setPrevSales(freshPrevSales)
            setPrevDate(freshPrevDate)
            setPrevPartialDeductions(freshPrevPartialDeductions)

            if (remitType === 'full') {
                // Re-seed non-CASH amounts from refreshed POS data,
                // preserving prev-only tender amounts if inclusion was confirmed
                const others: Record<string, string> = {}
                const freshTotals =
                    summaryRes?.result === 'success'
                        ? (summaryRes.data?.totals_by_method ?? {})
                        : {}
                freshSales
                    .filter((r) => r.payment_method !== 'CASH')
                    .forEach((r) => {
                        // Deduct any partial non-CASH remittances for editable tenders
                        const partialRemitted = isEditableTender(r.payment_method)
                            ? (freshTotals[r.payment_method] ?? 0)
                            : 0
                        const value = isEditableTender(r.payment_method)
                            ? String(
                                  parseFloat(
                                      Math.max(0, Number(r.total) - partialRemitted).toFixed(2)
                                  )
                              )
                            : r.total
                        others[r.payment_method] = value
                    })

                if (includePrevSales) {
                    // Re-seed prev-only amounts from refreshed prev sales
                    ;(freshPrevSales ?? [])
                        .filter(
                            (p) =>
                                p.payment_method !== 'CASH' &&
                                !freshSales.some((s) => s.payment_method === p.payment_method)
                        )
                        .forEach((p) => {
                            others[p.payment_method] = otherAmounts[p.payment_method] ?? p.total
                        })
                }

                setOtherAmounts(others)

                // Update partial summary and recalculate cash balance from fresh POS cash
                const freshPosCash = Number(
                    freshSales.find((r) => r.payment_method === 'CASH')?.total ?? 0
                )
                if (summaryRes?.result === 'success' && summaryRes.data) {
                    setPartialSummary(summaryRes.data)
                    const balance = parseFloat(
                        Math.max(0, freshPosCash - summaryRes.data.total_cash).toFixed(2)
                    )
                    setCashAmount(balance > 0 ? String(balance) : '0')
                } else {
                    setCashAmount(freshPosCash > 0 ? String(freshPosCash) : '')
                }
            }
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message: unknown }).message)
                    : null
            setSubmitError(msg ?? 'Could not refresh sales data. Check your connection.')
        } finally {
            setSalesRefreshing(false)
        }
    }

    // Step 2 — select type
    const handleSelectType = async (type: RemitType) => {
        setRemitType(type)
        setSelectError(null)
        setSubmitError(null)
        setOverrideApproval(null)
        setPartialSummary(null)
        setIncludePrevSales(false)

        if (type === 'full') {
            // Show prompt if: any non-editable prev tender exists in today's sales (auto-add),
            // OR any prev tender is missing from today's sales entirely (new row)
            const hasRelevantPrev = (prevSales ?? []).some(
                (p) =>
                    p.payment_method !== 'CASH' &&
                    (!salesData.some((s) => s.payment_method === p.payment_method) ||
                        !isEditableTender(p.payment_method))
            )
            if (hasRelevantPrev) {
                setPrevSalesPromptOpen(true)
                return // wait for user answer before proceeding
            }
        }

        if (type === 'partial') {
            // Show prompt if there are any prev-day unremitted sales at all
            if ((prevSales ?? []).length > 0) {
                setPrevSalesPromptOpen(true)
                return // wait for user answer before proceeding
            }
        }

        await proceedWithType(type)
    }

    // Continues to remit step after the prev-sales prompt is resolved (or skipped)
    // Normalise any amount string to always 2 decimal places
    const toFixed2 = (value: string | number): string =>
        parseFloat(String(value)).toFixed(2)

    const proceedWithType = async (type: RemitType, extraAmounts: Record<string, string> = {}) => {
        // Normalise all incoming extra amounts to 2dp
        const normalisedExtras = Object.fromEntries(
            Object.entries(extraAmounts).map(([k, v]) => [k, toFixed2(v)])
        )

        if (type === 'partial') {
            // Seed editable non-CASH tender amounts from POS values (partiable only)
            const editableOthers: Record<string, string> = {}
            salesData
                .filter((r) => r.payment_method !== 'CASH' && isEditableTender(r.payment_method) && isPartiableTender(r.payment_method))
                .forEach((r) => {
                    editableOthers[r.payment_method] = toFixed2(r.total)
                })
            setCashAmount('')
            // Merge normalisedExtras: prev-only tenders + combined editable amounts (today + prev)
            setOtherAmounts({ ...editableOthers, ...normalisedExtras })
            setStep('remit')
        } else {
            // Seed non-CASH amounts from POS; merge any extra prev-only amounts
            const others: Record<string, string> = {}
            salesData
                .filter((r) => r.payment_method !== 'CASH')
                .forEach((r) => {
                    others[r.payment_method] = toFixed2(r.total)
                })
            setOtherAmounts({ ...others, ...normalisedExtras })
            setStep('remit')

            // Fetch today's partial remittances to compute remaining balances
            setPartialSummaryLoading(true)
            try {
                const res = await apiFetch<PartialSummaryResponse>(
                    `/api/v1/remittance/partial-summary/${supplierCode}`,
                    { token: token ?? undefined }
                )
                if (res.result === 'success' && res.data) {
                    setPartialSummary(res.data)
                    const posCash = Number(cashRecord?.total ?? 0)
                    const balance = parseFloat(
                        Math.max(0, posCash - res.data.total_cash).toFixed(2)
                    )
                    // Pre-fill cash with the remaining balance (zero if already fully covered)
                    setCashAmount(toFixed2(balance > 0 ? balance : 0))
                    // Deduct any partial non-CASH remittances from editable tender amounts.
                    // Use the seeded value in `updated` as the base — it already contains the
                    // combined today+prev amount when previous sales are being included.
                    setOtherAmounts((prev) => {
                        const updated = { ...prev, ...normalisedExtras }
                        salesData
                            .filter(
                                (r) =>
                                    r.payment_method !== 'CASH' &&
                                    isEditableTender(r.payment_method)
                            )
                            .forEach((r) => {
                                const partialRemitted =
                                    res.data!.totals_by_method?.[r.payment_method] ?? 0
                                if (partialRemitted > 0) {
                                    // Base is the seeded amount (today + prev if applicable)
                                    const baseAmt = Number(updated[r.payment_method] ?? r.total)
                                    const remaining = parseFloat(
                                        Math.max(0, baseAmt - partialRemitted).toFixed(2)
                                    )
                                    updated[r.payment_method] = toFixed2(remaining)
                                }
                            })
                        return updated
                    })
                } else {
                    // Fallback: pre-fill with full POS cash if summary unavailable
                    setCashAmount(toFixed2(cashRecord?.total ?? 0))
                }
            } catch {
                // Non-fatal — fall back to POS cash total
                setCashAmount(toFixed2(cashRecord?.total ?? 0))
            } finally {
                setPartialSummaryLoading(false)
            }
        }
    }

    // Resolves the prev-sales prompt and continues to the remit step (full or partial)
    const handlePrevSalesAnswer = async (include: boolean) => {
        setIncludePrevSales(include)
        setPrevSalesPromptOpen(false)
        const type = remitType! // already set in handleSelectType before prompt opened
        if (include) {
            // Seed prev amounts into extra:
            //   • Prev-only tenders (not in today's sales) → seed with prev amount as new row
            //   • Editable tenders in both days → combine today's POS amount + prev amount
            //   • Non-editable tenders in today's sales → handled by prevAdd in executeFullRemittance
            const extra: Record<string, string> = {}
            ;(prevSales ?? [])
                .filter((p) => p.payment_method !== 'CASH')
                .forEach((p) => {
                    const todaySale = salesData.find((s) => s.payment_method === p.payment_method)
                    if (!todaySale) {
                        // Prev-only: seed with prev amount
                        extra[p.payment_method] = toFixed2(p.total)
                    } else if (isEditableTender(p.payment_method)) {
                        // Editable tender present in both days: pre-fill with today + prev combined
                        extra[p.payment_method] = toFixed2(Number(todaySale.total) + Number(p.total))
                    } else if (type === 'partial' && isPartiableTender(p.payment_method)) {
                        // Non-editable but partiable tender in today's sales, partial mode:
                        // It is never shown in the editable block, so seed it as a prev-only row.
                        extra[p.payment_method] = toFixed2(p.total)
                    }
                    // Non-editable in today's sales (full): prevAdd handles it in executeFullRemittance
                })
            await proceedWithType(type, extra)
        } else {
            await proceedWithType(type)
        }
    }

    // Helpers derived from tenderTypes
    const tenderMap = new Map(tenderTypes.map((t) => [t.code, t]))
    const isEditableTender = (method: string): boolean => {
        if (tenderTypes.length === 0) return method !== 'CASH'
        return (tenderMap.get(method)?.is_editable ?? 0) === 1
    }
    const isPartiableTender = (method: string): boolean => {
        if (tenderTypes.length === 0) return true // fallback: show all when types haven't loaded
        return (tenderMap.get(method)?.is_partiable ?? 0) === 1
    }
    const prevSalesMap = new Map((prevSales ?? []).map((r) => [r.payment_method, Number(r.total)]))

    // Computed cash balance: POS cash minus today's partial remittances (rounded to 2dp to avoid float drift)
    // For partial with prev sales included, the ceiling also covers yesterday's unremitted CASH.
    const prevCashAmt = includePrevSales ? (prevSalesMap.get('CASH') ?? 0) : 0
    const computedBalance =
        remitType === 'full'
            ? parseFloat(
                  Math.max(
                      0,
                      Number(cashRecord?.total ?? 0) - (partialSummary?.total_cash ?? 0)
                  ).toFixed(2)
              )
            : Number(cashRecord?.total ?? 0) + prevCashAmt

    // True when the operator typed a cash amount that differs from the computed balance
    // For full: must match exact balance. For partial: must be <= current cash total.
    const cashOverrideNeeded =
        remitType === 'full'
            ? !partialSummaryLoading && cashAmount !== '' && Number(cashAmount) !== computedBalance
            : cashAmount !== '' && Number(cashAmount) > computedBalance
    // Tenders from yesterday that need a separate row in the partial/full form.
    // Includes:
    //  1. Tenders not in today's sales at all
    //  2. (Partial only) Non-editable tenders that ARE in today's sales — they are
    //     never shown in the editable block, so they need their own prev-only row.
    const prevOnlyTenders: SalesRecord[] = includePrevSales
        ? (prevSales ?? []).filter((p) => {
              if (p.payment_method === 'CASH') return false
              // In partial mode, skip tenders that are not partiable
              if (remitType === 'partial' && !isPartiableTender(p.payment_method)) return false
              const notInToday = !salesData.some((s) => s.payment_method === p.payment_method)
              if (notInToday) return true
              // Partial: also surface non-editable tenders that exist in today's sales —
              // they are hidden from the editable block but still need to be remitted.
              return remitType === 'partial' && !isEditableTender(p.payment_method)
          })
        : []
    const sortedSales = [...salesData].sort((a, b) => {
        const sortA = tenderMap.get(a.payment_method)?.sort ?? 9999
        const sortB = tenderMap.get(b.payment_method)?.sort ?? 9999
        return sortA - sortB
    })
    // Constants are authoritative for labels; DB label is fallback for unknown codes only
    const tenderLabel = (method: string) =>
        methodLabel(method) !== method
            ? methodLabel(method)
            : (tenderMap.get(method)?.label ?? method)

    // Determine whether any editable amount was changed from POS value, or cash differs from balance
    const detectOverrideNeeded = (): boolean => {
        if (includePrevSales) return true // previous sales inclusion always requires override
        if (remitType === 'partial') {
            // Override if cash exceeds POS cash balance
            if (cashOverrideNeeded) return true
            // Override if any editable non-CASH tender exceeds its POS total
            return salesData
                .filter((r) => r.payment_method !== 'CASH' && isEditableTender(r.payment_method))
                .some((r) => {
                    const edited = otherAmounts[r.payment_method]
                    return edited !== undefined && Number(edited) > Number(r.total)
                })
        }

        const editableChanged = salesData
            .filter((r) => r.payment_method !== 'CASH' && isEditableTender(r.payment_method))
            .some((r) => {
                const edited = otherAmounts[r.payment_method]
                if (edited === undefined) return false
                // Compare against the expected remaining amount (POS + prev − already partially
                // remitted), not just the raw POS total — otherwise seeded amounts look changed.
                const partialRemitted = partialSummary?.totals_by_method?.[r.payment_method] ?? 0
                const prevAmt = includePrevSales ? (prevSalesMap.get(r.payment_method) ?? 0) : 0
                const expectedRemaining = Math.max(0, Number(r.total) + prevAmt - partialRemitted)
                return Number(edited) !== expectedRemaining
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
                    const prevAdd =
                        includePrevSales && !isEditableTender(r.payment_method)
                            ? (prevSalesMap.get(r.payment_method) ?? 0)
                            : 0
                    const editedVal = isEditableTender(r.payment_method)
                        ? Number(otherAmounts[r.payment_method] ?? r.total)
                        : Number(r.total) + prevAdd
                    // Override flag: compare against expected remaining (POS + prev − partial).
                    // Include prev amount for editable tenders when previous sales are included.
                    const partialRemitted =
                        partialSummary?.totals_by_method?.[r.payment_method] ?? 0
                    const prevAmt =
                        includePrevSales && isEditableTender(r.payment_method)
                            ? (prevSalesMap.get(r.payment_method) ?? 0)
                            : 0
                    const expectedRemaining = Math.max(
                        0,
                        Number(r.total) + prevAmt - partialRemitted
                    )
                    const wasChanged =
                        isEditableTender(r.payment_method) && editedVal !== expectedRemaining
                    return {
                        label: tenderLabel(r.payment_method),
                        value: fmt(editedVal),
                        overridden: !!approval && wasChanged,
                    }
                }),
                // Prev-only tenders (not in today's sales, user-editable amount)
                ...prevOnlyTenders.map((p) => ({
                    label: `${tenderLabel(p.payment_method)} (prev.)`,
                    value: fmt(Number(otherAmounts[p.payment_method] ?? p.total)),
                    overridden: !!approval,
                })),
            ]
        }

        const partialRows: ConfirmRow[] = [
            { label: 'Supplier', value: supplierLabel },
            { label: 'Remitter', value: remitterName.trim() || '—' },
            { label: 'Type', value: 'Partial Remittance' },
        ]
        // Cash line — omit if 0 or not partiable
        if (isPartiableTender('CASH') && cashVal > 0) {
            partialRows.push({
                label: 'Cash to Remit',
                value: fmt(cashVal),
                overridden: !!approval && cashOverrideNeeded,
            })
        }
        // Editable non-CASH lines (partiable only)
        sortedSales
            .filter((r) => r.payment_method !== 'CASH' && isEditableTender(r.payment_method) && isPartiableTender(r.payment_method))
            .forEach((r) => {
                const amt = Number(otherAmounts[r.payment_method] ?? 0)
                if (amt > 0) {
                    partialRows.push({
                        label: tenderLabel(r.payment_method),
                        value: fmt(amt),
                        overridden: !!approval && amt > Number(r.total),
                    })
                }
            })
        // Prev-only tender lines (yesterday's sales not present in today's POS data)
        prevOnlyTenders.forEach((p) => {
            const amt = Number(otherAmounts[p.payment_method] ?? p.total)
            if (amt > 0) {
                partialRows.push({
                    label: `${tenderLabel(p.payment_method)} (prev.)`,
                    value: fmt(amt),
                    overridden: !!approval,
                })
            }
        })
        return partialRows
    }

    // Step 3 — validate then either open override or confirm modal
    const handleSubmit = () => {
        setSubmitError(null)

        const cashVal = cashAmount === '' ? 0 : Number(cashAmount)

        if (remitType === 'partial') {
            // Cash is optional for partial — but at least one tender must have an amount > 0
            if (isPartiableTender('CASH') && (isNaN(cashVal) || cashVal < 0)) {
                setSubmitError('Please enter a valid cash amount.')
                return
            }
            const effectiveCashVal = isPartiableTender('CASH') ? cashVal : 0
            const editableNonCashTotal = salesData
                .filter((r) => r.payment_method !== 'CASH' && isEditableTender(r.payment_method) && isPartiableTender(r.payment_method))
                .reduce((sum, r) => sum + Number(otherAmounts[r.payment_method] ?? 0), 0)
            // Also count prev-only tenders (yesterday's, not in today's sales)
            const prevOnlyTotal = prevOnlyTenders.reduce(
                (sum, p) => sum + Number(otherAmounts[p.payment_method] ?? p.total),
                0,
            )
            if (effectiveCashVal === 0 && editableNonCashTotal === 0 && prevOnlyTotal === 0) {
                setSubmitError('Please enter an amount for at least one payment method.')
                return
            }
        } else {
            // For full remittance, 0 is allowed when prior partial remittances already
            // cover the entire cash balance (balance = 0).
            if (!cashAmount || isNaN(cashVal) || cashVal < 0) {
                setSubmitError('Please enter a valid cash amount.')
                return
            }
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
        const lines: ReceiptLine[] = []

        // Helper: split an entered amount into current-day vs prev-day portions and push lines
        const pushSplitLines = (method: string, entered: number, todayBase: number, prevBase: number) => {
            if (!includePrevSales) {
                if (entered > 0) lines.push({ method, amount: toFixed2(entered) })
                return
            }
            // Current-day portion: up to todayBase
            const currentAmt = parseFloat(Math.min(entered, todayBase).toFixed(2))
            // Prev-day portion: remainder, capped at prevBase
            const prevAmt = parseFloat(Math.min(Math.max(0, entered - todayBase), prevBase).toFixed(2))
            if (currentAmt > 0) lines.push({ method, amount: toFixed2(currentAmt) })
            if (prevAmt > 0) lines.push({ method, amount: toFixed2(prevAmt), is_prev_sales: true })
        }

        sortedSales.forEach((r) => {
            if (r.payment_method === 'CASH') {
                // Today's remaining cash base (after partials already remitted today)
                const todayCashBase = Math.max(
                    0,
                    Number(cashRecord?.total ?? 0) - (partialSummary?.total_cash ?? 0),
                )
                const prevCashBase = prevSalesMap.get('CASH') ?? 0
                pushSplitLines('CASH', Number(cashAmount), todayCashBase, prevCashBase)
                return
            }

            if (isEditableTender(r.payment_method)) {
                // Editable: operator may have combined today + prev in one field
                const todayBase = Math.max(
                    0,
                    Number(r.total) - (partialSummary?.totals_by_method?.[r.payment_method] ?? 0),
                )
                const prevBase = prevSalesMap.get(r.payment_method) ?? 0
                const entered = Number(otherAmounts[r.payment_method] ?? r.total)
                pushSplitLines(r.payment_method, entered, todayBase, prevBase)
            } else {
                // Non-editable: fixed POS amount; prev day is a separate known value
                const currentAmt = Number(r.total)
                if (currentAmt > 0) lines.push({ method: r.payment_method, amount: toFixed2(currentAmt) })
                if (includePrevSales) {
                    const prevAmt = prevSalesMap.get(r.payment_method) ?? 0
                    if (prevAmt > 0)
                        lines.push({ method: r.payment_method, amount: toFixed2(prevAmt), is_prev_sales: true })
                }
            }
        })

        // Prev-only tenders — entirely prev-day
        prevOnlyTenders
            .map((p) => ({ method: p.payment_method, amount: otherAmounts[p.payment_method] ?? p.total }))
            .filter((l) => Number(l.amount) > 0)
            .forEach((l) => lines.push({ ...l, amount: toFixed2(l.amount), is_prev_sales: true }))

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
                has_prev_sales: includePrevSales,
            }
            // Amount override takes precedence; fall back to skip-prev-sales override for audit log
            const effectiveOverride = overrideApproval ?? skipPrevSalesOverride
            if (effectiveOverride) {
                body.override = {
                    approver_user_id: effectiveOverride.approverId,
                    remarks: effectiveOverride.remarks,
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
        const lines: ReceiptLine[] = []

        // CASH — split into prev-day first, then current-day as remainder (only if partiable)
        const cashVal = Number(cashAmount)
        if (isPartiableTender('CASH') && cashVal > 0) {
            if (!includePrevSales) {
                lines.push({ method: 'CASH', amount: cashAmount })
            } else {
                const todayCashBase = Math.max(
                    0,
                    Number(cashRecord?.total ?? 0) - (partialSummary?.total_cash ?? 0),
                )
                const prevCashBase = prevSalesMap.get('CASH') ?? 0
                // Prev is consumed first; current is whatever remains after prev is satisfied
                const prevCash = parseFloat(Math.min(cashVal, prevCashBase).toFixed(2))
                const currentCash = parseFloat(
                    Math.min(Math.max(0, cashVal - prevCashBase), todayCashBase).toFixed(2),
                )
                if (prevCash > 0) lines.push({ method: 'CASH', amount: toFixed2(prevCash), is_prev_sales: true })
                if (currentCash > 0) lines.push({ method: 'CASH', amount: toFixed2(currentCash) })
            }
        }

        // Editable non-CASH tenders (partiable only) — prev-day consumed first, current-day is the remainder
        sortedSales
            .filter((r) => r.payment_method !== 'CASH' && isEditableTender(r.payment_method) && isPartiableTender(r.payment_method))
            .forEach((r) => {
                const entered = Number(otherAmounts[r.payment_method] ?? 0)
                if (entered <= 0) return
                if (!includePrevSales) {
                    lines.push({ method: r.payment_method, amount: toFixed2(entered) })
                    return
                }
                const todayBase = Math.max(
                    0,
                    Number(r.total) - (partialSummary?.totals_by_method?.[r.payment_method] ?? 0),
                )
                const prevBase = prevSalesMap.get(r.payment_method) ?? 0
                // Prev is consumed first; current is whatever remains after prev is satisfied
                const prevAmt = parseFloat(Math.min(entered, prevBase).toFixed(2))
                const currentAmt = parseFloat(
                    Math.min(Math.max(0, entered - prevBase), todayBase).toFixed(2),
                )
                if (prevAmt > 0)
                    lines.push({ method: r.payment_method, amount: toFixed2(prevAmt), is_prev_sales: true })
                if (currentAmt > 0) lines.push({ method: r.payment_method, amount: toFixed2(currentAmt) })
            })

        // Prev-only tenders (yesterday's unremitted, not in today's POS / non-editable in today)
        // — entirely prev-day
        prevOnlyTenders.forEach((p) => {
            const amt = otherAmounts[p.payment_method] ?? p.total
            if (Number(amt) > 0) {
                lines.push({ method: p.payment_method, amount: toFixed2(amt), is_prev_sales: true })
            }
        })

        setConfirmOpen(false)
        setLoading(true)

        try {
            const body: Record<string, unknown> = {
                supplier_code: supplierCode,
                supplier_name: supplierName,
                remitter_name: remitterName.trim(),
                remit_type: 'partial',
                lines,
                has_prev_sales: includePrevSales,
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
        setSkipPrevOverrideOpen(false)
        setSkipPrevSalesOverride(null)
        setPartialSummary(null)
        setPartialSummaryLoading(false)
        setPrevSales(null)
        setPrevDate(null)
        setPrevPartialDeductions(null)
        setPrevSalesPromptOpen(false)
        setIncludePrevSales(false)
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

            {/* Override required to skip previous unremitted sales */}
            <OverrideModal
                open={skipPrevOverrideOpen}
                message={`Supervisor approval is required to skip previous unremitted sales from ${prevDate ?? 'the previous day'}. Enter approver credentials to proceed.`}
                onClose={() => {
                    setSkipPrevOverrideOpen(false)
                    setPrevSalesPromptOpen(true) // return to prompt if cancelled
                }}
                onApproved={(approverId, remarks) => {
                    setSkipPrevSalesOverride({ approverId, remarks })
                    setSkipPrevOverrideOpen(false)
                    void handlePrevSalesAnswer(false)
                }}
            />

            {/* Previous sales inclusion prompt */}
            {prevSalesPromptOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-84 rounded-xl border bg-card p-6 shadow-xl flex flex-col gap-4">
                        <div>
                            <p className="font-semibold text-base">
                                Include Previous Unremitted Sales?
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                The following sales from{' '}
                                <span className="font-medium">{prevDate}</span> have no full
                                remittance and can be combined with today's totals.
                            </p>
                        </div>
                        <div className="rounded-lg border bg-muted/40 px-4 py-3 flex flex-col gap-2">
                            {(prevSales ?? []).map((p) => {
                                const deducted = prevPartialDeductions?.[p.payment_method] ?? 0
                                const original = Number(p.total) + deducted
                                const hasDeduction = deducted > 0
                                return (
                                    <div key={p.payment_method} className="flex flex-col gap-0.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                {methodLabel(p.payment_method)}
                                            </span>
                                            {hasDeduction ? (
                                                <span className="tabular-nums text-xs text-muted-foreground line-through">
                                                    {fmt(original)}
                                                </span>
                                            ) : (
                                                <span className="font-medium tabular-nums">
                                                    {fmt(Number(p.total))}
                                                </span>
                                            )}
                                        </div>
                                        {hasDeduction && (
                                            <>
                                                <div className="flex justify-between text-xs pl-2">
                                                    <span className="text-muted-foreground italic">
                                                        Less: partial remitted
                                                    </span>
                                                    <span className="tabular-nums text-destructive font-medium">
                                                        − {fmt(deducted)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm pl-2 font-medium">
                                                    <span className="text-muted-foreground">
                                                        Remaining
                                                    </span>
                                                    <span className="tabular-nums">
                                                        {fmt(Number(p.total))}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <button
                                    className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                                    onClick={() => {
                                        setPrevSalesPromptOpen(false)
                                        setSkipPrevOverrideOpen(true)
                                    }}
                                >
                                    No, skip
                                </button>
                                <button
                                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                                    onClick={() => handlePrevSalesAnswer(true)}
                                >
                                    Yes, include
                                </button>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground"
                                onClick={() => setPrevSalesPromptOpen(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

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
                onRemarksChange={(remarks) =>
                    setOverrideApproval((prev) => (prev ? { ...prev, remarks } : prev))
                }
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
                <div className="w-160 shrink-0">
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
                            onRefreshSales={handleRefreshSales}
                            salesRefreshing={salesRefreshing}
                            prevSalesMap={prevSalesMap}
                            includePrevSales={includePrevSales}
                            prevOnlyTenders={prevOnlyTenders}
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

                {/* Right — context panel + prev sales */}
                <div className="w-72 shrink-0 flex flex-col gap-4">
                    <div className="rounded-xl border bg-card p-5">
                        <ContextPanel
                            step={step}
                            supplierCode={supplierCode}
                            supplierName={supplierName}
                            remitterName={remitterName}
                            remitType={remitType}
                            salesData={salesData}
                            receipt={receipt}
                            tenderTypes={tenderTypes}
                        />
                    </div>

                    {/* Previous unremitted sales card */}
                    {prevSales &&
                        prevSales.length > 0 &&
                        (step === 'select-type' || step === 'remit') && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex flex-col gap-3">
                                <div>
                                    <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
                                        Previous Unremitted Sales
                                    </p>
                                    {prevDate && (
                                        <p className="text-xs text-amber-700 mt-0.5">{prevDate}</p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    {prevSales.map((r) => {
                                        const deducted = prevPartialDeductions?.[r.payment_method] ?? 0
                                        const original = Number(r.total) + deducted
                                        const hasDeduction = deducted > 0
                                        return (
                                            <div key={r.payment_method} className="flex flex-col gap-0.5">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-amber-800">
                                                        {methodLabel(r.payment_method)}
                                                    </span>
                                                    {hasDeduction ? (
                                                        <span className="tabular-nums text-xs text-muted-foreground line-through">
                                                            {fmt(original)}
                                                        </span>
                                                    ) : (
                                                        <span className="font-medium tabular-nums text-amber-900">
                                                            {fmt(Number(r.total))}
                                                        </span>
                                                    )}
                                                </div>
                                                {hasDeduction && (
                                                    <>
                                                        <div className="flex justify-between text-xs pl-2">
                                                            <span className="text-amber-700 italic">
                                                                Less: partial remitted
                                                            </span>
                                                            <span className="tabular-nums text-destructive font-medium">
                                                                − {fmt(deducted)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-sm pl-2">
                                                            <span className="text-amber-800 font-medium">
                                                                Remaining
                                                            </span>
                                                            <span className="font-semibold tabular-nums text-amber-900">
                                                                {fmt(Number(r.total))}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )
                                    })}
                                    <div className="mt-1 flex justify-between border-t border-amber-200 pt-2 text-sm font-semibold">
                                        <span className="text-amber-800">Total Remaining</span>
                                        <span className="tabular-nums text-amber-900">
                                            {fmt(
                                                prevSales.reduce((s, r) => s + Number(r.total), 0)
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                </div>
            </div>
        </div>
    )
}
