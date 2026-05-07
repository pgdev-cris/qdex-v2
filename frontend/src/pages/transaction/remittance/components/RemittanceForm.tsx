import { ArrowLeft, AlertCircle, Loader2, ShieldAlert, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { SalesRecord, RemitType, PartialSummary, TenderType } from '../types'
import { fmt, methodLabel } from '../helpers'

interface Props {
    remitType: RemitType
    supplierCode: string
    supplierName: string
    salesData: SalesRecord[]
    tenderTypes: TenderType[]
    cashRecord: SalesRecord | undefined
    cashAmount: string
    otherAmounts: Record<string, string>
    partialSummary: PartialSummary | null
    partialSummaryLoading: boolean
    // true when the entered cash amount deviates from the computed balance
    cashOverrideNeeded: boolean
    submitError: string | null
    loading: boolean
    onCashChange: (value: string) => void
    onOtherAmountChange: (method: string, value: string) => void
    onSubmit: () => void
    onBack: () => void
    onRefreshSales?: () => void
    salesRefreshing?: boolean
    prevSalesMap?: Map<string, number>
    includePrevSales?: boolean
    prevOnlyTenders?: SalesRecord[]
}

export const RemittanceForm = ({
    remitType,
    supplierCode,
    supplierName,
    salesData,
    tenderTypes,
    cashRecord,
    cashAmount,
    otherAmounts,
    partialSummary,
    partialSummaryLoading,
    cashOverrideNeeded,
    submitError,
    loading,
    onCashChange,
    onOtherAmountChange,
    onSubmit,
    onBack,
    onRefreshSales,
    salesRefreshing = false,
    prevSalesMap = new Map(),
    includePrevSales = false,
    prevOnlyTenders = [],
}: Props) => {
    const posCashTotal = Number(cashRecord?.total ?? 0)
    const totalPartial = partialSummary?.total_cash ?? 0
    const balance = Math.max(0, posCashTotal - totalPartial)
    const hasPartial = (partialSummary?.count ?? 0) > 0

    // Build a lookup map for tender type metadata keyed by code
    const tenderMap = new Map<string, TenderType>(tenderTypes.map((t) => [t.code, t]))

    // Sort salesData rows by the tender type's sort column; unknown codes go last
    const sortedSalesData = [...salesData].sort((a, b) => {
        const sortA = tenderMap.get(a.payment_method)?.sort ?? 9999
        const sortB = tenderMap.get(b.payment_method)?.sort ?? 9999
        return sortA - sortB
    })

    // A row is editable when its tender type has is_editable = 1
    // If tenderTypes haven't loaded yet, fall back to the old behaviour (non-CASH editable)
    const isEditable = (method: string): boolean => {
        if (tenderTypes.length === 0) return method !== 'CASH'
        return (tenderMap.get(method)?.is_editable ?? 0) === 1
    }

    // A row appears in partial remittance only when is_partiable = 1
    // If tenderTypes haven't loaded yet, show all by default
    const isPartiable = (method: string): boolean => {
        if (tenderTypes.length === 0) return true
        return (tenderMap.get(method)?.is_partiable ?? 0) === 1
    }

    // Format a raw input string to 2 decimal places on blur
    const toTwoDecimals = (value: string): string => {
        const num = parseFloat(value)
        return isNaN(num) ? '' : num.toFixed(2)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {remitType === 'partial' ? 'Partial Remittance' : 'Full Remittance'}
                        </CardTitle>
                        <CardDescription>
                            Supplier:{' '}
                            <span className="font-medium text-foreground">{supplierCode}</span>
                            {supplierName && (
                                <span className="ml-1 text-foreground">— {supplierName}</span>
                            )}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                        {onRefreshSales && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefreshSales}
                                disabled={salesRefreshing || loading}
                                className="text-muted-foreground"
                                title="Refresh sales data from POS"
                            >
                                <RefreshCw
                                    className={`h-3.5 w-3.5 ${salesRefreshing ? 'animate-spin' : ''}`}
                                />
                                Refresh
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onBack}
                            className="text-muted-foreground"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
                {/* Full: payment summary with inline partial breakdowns per tender */}
                {remitType === 'full' && (
                    <div className="flex flex-col gap-3">
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                            Payment Summary
                        </p>

                        {/* Each tender is its own mini-card for clear visual separation */}
                        <div className="flex flex-col gap-3">
                            {sortedSalesData.map((rec) => {
                                const label =
                                    methodLabel(rec.payment_method) !== rec.payment_method
                                        ? methodLabel(rec.payment_method)
                                        : (tenderMap.get(rec.payment_method)?.label ??
                                          rec.payment_method)

                                // ── Cash ──────────────────────────────────────────
                                if (rec.payment_method === 'CASH') {
                                    return (
                                        <div
                                            key="CASH"
                                            className="rounded-lg border overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between px-4 py-3 gap-4">
                                                <span className="text-sm font-medium shrink-0">
                                                    {label}
                                                </span>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="relative w-36">
                                                        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 select-none text-sm">
                                                            ₱
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            className="pl-7 text-right tabular-nums h-8 text-sm"
                                                            value={cashAmount}
                                                            onChange={(e) =>
                                                                onCashChange(e.target.value)
                                                            }
                                                            onBlur={(e) => {
                                                                const v = toTwoDecimals(
                                                                    e.target.value
                                                                )
                                                                if (v) onCashChange(v)
                                                            }}
                                                        />
                                                    </div>
                                                    {cashOverrideNeeded && (
                                                        <p className="flex items-center gap-1 text-xs text-amber-700">
                                                            <ShieldAlert className="h-3 w-3 shrink-0" />
                                                            Override required
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Cash partial breakdown — only when there are partials */}
                                            {partialSummaryLoading ? (
                                                <div className="flex items-center gap-2 px-4 py-3 border-t text-xs text-muted-foreground bg-muted/20">
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    Loading partial remittances…
                                                </div>
                                            ) : hasPartial ? (
                                                <div className="border-t bg-muted/20 flex flex-col text-sm">
                                                    <div className="flex items-center justify-between px-4 py-2 border-b">
                                                        <span className="text-xs text-muted-foreground">
                                                            Cash Sales (POS)
                                                        </span>
                                                        <span className="tabular-nums text-xs font-semibold">
                                                            {fmt(posCashTotal)}
                                                        </span>
                                                    </div>
                                                    <div className="px-4 pt-2 pb-1">
                                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                            Less: Partial Remitted (
                                                            {partialSummary!.count}×)
                                                        </p>
                                                    </div>
                                                    {partialSummary!.transactions.map((tx) => (
                                                        <div
                                                            key={tx.receipt_no}
                                                            className="flex items-center justify-between px-4 py-1.5 border-b last:border-b-0"
                                                        >
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-medium text-xs">
                                                                    {tx.receipt_no}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    {tx.reference_code}
                                                                </span>
                                                            </div>
                                                            <span className="tabular-nums text-destructive text-xs font-medium">
                                                                − {fmt(tx.cash_amount)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    <div className="flex items-center justify-between px-4 py-1.5 border-b bg-destructive/5">
                                                        <span className="text-xs text-destructive font-medium">
                                                            Total Partial Remitted
                                                        </span>
                                                        <span className="tabular-nums text-destructive text-xs font-semibold">
                                                            − {fmt(totalPartial)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                                                        <span className="text-xs font-semibold">
                                                            Balance to Remit
                                                        </span>
                                                        <span
                                                            className={`tabular-nums text-xs font-semibold ${balance <= 0 ? 'text-muted-foreground' : 'text-primary'}`}
                                                        >
                                                            {fmt(balance)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    )
                                }

                                // ── Editable non-CASH ─────────────────────────────
                                if (isEditable(rec.payment_method)) {
                                    const txs =
                                        partialSummary?.transactions_by_method?.[
                                            rec.payment_method
                                        ] ?? []
                                    const totalRemitted = txs.reduce(
                                        (s, t) => s + Number(t.amount),
                                        0
                                    )
                                    const posAmt = Number(rec.total)
                                    const remaining = parseFloat(
                                        Math.max(0, posAmt - totalRemitted).toFixed(2)
                                    )
                                    const partialAmt =
                                        partialSummary?.totals_by_method?.[rec.payment_method] ?? 0
                                    const expectedRemaining = parseFloat(
                                        Math.max(0, posAmt - partialAmt).toFixed(2)
                                    )
                                    const editedAmt = Number(
                                        otherAmounts[rec.payment_method] ?? rec.total
                                    )
                                    const overrideNeeded =
                                        !partialSummaryLoading && editedAmt !== expectedRemaining
                                    return (
                                        <div
                                            key={rec.payment_method}
                                            className="rounded-lg border overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between px-4 py-3 gap-4">
                                                <span className="text-sm font-medium shrink-0">
                                                    {label}
                                                </span>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="relative w-36">
                                                        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 select-none text-sm">
                                                            ₱
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            placeholder={rec.total}
                                                            className="pl-7 text-right tabular-nums h-8 text-sm"
                                                            value={
                                                                otherAmounts[rec.payment_method] ??
                                                                rec.total
                                                            }
                                                            onChange={(e) =>
                                                                onOtherAmountChange(
                                                                    rec.payment_method,
                                                                    e.target.value
                                                                )
                                                            }
                                                            onBlur={(e) => {
                                                                const v = toTwoDecimals(
                                                                    e.target.value
                                                                )
                                                                if (v)
                                                                    onOtherAmountChange(
                                                                        rec.payment_method,
                                                                        v
                                                                    )
                                                            }}
                                                        />
                                                    </div>
                                                    {overrideNeeded && (
                                                        <p className="flex items-center gap-1 text-xs text-amber-700">
                                                            <ShieldAlert className="h-3 w-3 shrink-0" />
                                                            Override required
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Non-CASH partial breakdown — only when there are partials */}
                                            {!partialSummaryLoading && txs.length > 0 && (
                                                <div className="border-t bg-muted/20 flex flex-col text-sm">
                                                    <div className="flex items-center justify-between px-4 py-2 border-b">
                                                        <span className="text-xs text-muted-foreground">
                                                            {label} (POS)
                                                        </span>
                                                        <span className="tabular-nums text-xs font-semibold">
                                                            {fmt(posAmt)}
                                                        </span>
                                                    </div>
                                                    <div className="px-4 pt-2 pb-1">
                                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                            Less: Partial Remitted ({txs.length}×)
                                                        </p>
                                                    </div>
                                                    {txs.map((tx) => (
                                                        <div
                                                            key={tx.receipt_no}
                                                            className="flex items-center justify-between px-4 py-1.5 border-b last:border-b-0"
                                                        >
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-medium text-xs">
                                                                    {tx.receipt_no}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    {tx.reference_code}
                                                                </span>
                                                            </div>
                                                            <span className="tabular-nums text-destructive text-xs font-medium">
                                                                − {fmt(tx.amount)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    <div className="flex items-center justify-between px-4 py-1.5 border-b bg-destructive/5">
                                                        <span className="text-xs text-destructive font-medium">
                                                            Total Partial Remitted
                                                        </span>
                                                        <span className="tabular-nums text-destructive text-xs font-semibold">
                                                            − {fmt(totalRemitted)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                                                        <span className="text-xs font-semibold">
                                                            Balance to Remit
                                                        </span>
                                                        <span
                                                            className={`tabular-nums text-xs font-semibold ${remaining <= 0 ? 'text-muted-foreground' : 'text-primary'}`}
                                                        >
                                                            {fmt(remaining)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                }

                                // ── Non-editable ───────────────────────────────────
                                return (
                                    <div
                                        key={rec.payment_method}
                                        className="rounded-lg border flex items-center justify-between px-4 py-3 gap-4"
                                    >
                                        <span className="text-sm font-medium shrink-0">
                                            {label}
                                        </span>
                                        <span className="tabular-nums text-sm font-mono">
                                            {fmt(
                                                Number(rec.total) +
                                                    (includePrevSales
                                                        ? (prevSalesMap.get(rec.payment_method) ??
                                                          0)
                                                        : 0)
                                            )}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Prev-only tenders — respect is_editable for display */}
                        {prevOnlyTenders.length > 0 && (
                            <div className="flex flex-col gap-3">
                                {prevOnlyTenders.map((rec) => {
                                    const editable = isEditable(rec.payment_method)
                                    const label =
                                        methodLabel(rec.payment_method) !== rec.payment_method
                                            ? methodLabel(rec.payment_method)
                                            : (tenderMap.get(rec.payment_method)?.label ??
                                              rec.payment_method)
                                    return (
                                        <div
                                            key={rec.payment_method}
                                            className="rounded-lg border border-amber-200 bg-amber-50 flex items-center justify-between px-4 py-3 gap-4"
                                        >
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-sm font-medium">{label}</span>
                                                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
                                                    prev.
                                                </span>
                                            </div>
                                            {editable ? (
                                                <div className="relative w-36">
                                                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 select-none text-sm">
                                                        ₱
                                                    </span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="pl-7 text-right tabular-nums h-8 text-sm"
                                                        value={
                                                            otherAmounts[rec.payment_method] ??
                                                            rec.total
                                                        }
                                                        onChange={(e) =>
                                                            onOtherAmountChange(
                                                                rec.payment_method,
                                                                e.target.value
                                                            )
                                                        }
                                                        onBlur={(e) => {
                                                            const v = toTwoDecimals(e.target.value)
                                                            if (v)
                                                                onOtherAmountChange(
                                                                    rec.payment_method,
                                                                    v
                                                                )
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <span className="tabular-nums text-sm font-mono">
                                                    {fmt(
                                                        Number(
                                                            otherAmounts[rec.payment_method] ??
                                                                rec.total
                                                        )
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Partial: top note */}
                {remitType === 'partial' && (!!cashRecord && isPartiable('CASH') || sortedSalesData.some((r) => r.payment_method !== 'CASH' && isEditable(r.payment_method) && isPartiable(r.payment_method)) || prevOnlyTenders.length > 0) && (
                    <p className="text-xs text-muted-foreground">
                        Amounts are pre-filled from POS. Entering more than the POS total requires override approval.
                    </p>
                )}

                {/* Partial: cash card */}
                {remitType === 'partial' && !!cashRecord && isPartiable('CASH') && (() => {
                    const prevCash = includePrevSales ? (prevSalesMap.get('CASH') ?? 0) : 0
                    const hasPrevCash = prevCash > 0
                    const maxCash = Number(cashRecord.total) + prevCash
                    const hasOtherTenders = sortedSalesData.some((r) => r.payment_method !== 'CASH' && isEditable(r.payment_method) && isPartiable(r.payment_method)) || prevOnlyTenders.length > 0
                    return (
                        <div className="rounded-lg border overflow-hidden flex flex-col">
                            <div className="flex flex-col px-4 py-3 gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-sm font-medium">Cash</span>
                                        {hasPrevCash && (
                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
                                                prev.
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                        {hasOtherTenders ? `optional, max ${fmt(maxCash)}` : `max ${fmt(maxCash)}`}
                                    </span>
                                </div>
                                <div className="relative">
                                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 select-none text-sm">₱</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-7 text-right tabular-nums"
                                        value={cashAmount}
                                        onChange={(e) => onCashChange(e.target.value)}
                                        onBlur={(e) => { const v = toTwoDecimals(e.target.value); if (v) onCashChange(v) }}
                                    />
                                </div>
                                {hasPrevCash && (
                                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                        <div className="flex justify-between">
                                            <span>Today</span>
                                            <span className="tabular-nums">{fmt(cashRecord.total)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Previous day</span>
                                            <span className="tabular-nums text-amber-700">+ {fmt(prevCash)}</span>
                                        </div>
                                    </div>
                                )}
                                {cashOverrideNeeded && (
                                    <p className="flex items-center gap-1 text-xs text-amber-700">
                                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                        Exceeds POS total — override required
                                    </p>
                                )}
                            </div>
                            {hasPrevCash && (
                                <div className="border-t border-amber-200 bg-amber-50/60 px-4 py-2 text-xs text-amber-700">
                                    Previous day unremitted amounts. Adjust if collecting partial only.
                                </div>
                            )}
                        </div>
                    )
                })()}

                {/* Partial: editable non-CASH cards */}
                {remitType === 'partial' && sortedSalesData
                    .filter((r) => r.payment_method !== 'CASH' && isEditable(r.payment_method) && isPartiable(r.payment_method))
                    .map((rec) => {
                        const amt = Number(otherAmounts[rec.payment_method] ?? 0)
                        const prevAmt = includePrevSales ? (prevSalesMap.get(rec.payment_method) ?? 0) : 0
                        const hasPrev = prevAmt > 0
                        const maxAmt = Number(rec.total) + prevAmt
                        const exceedsPOS = amt > maxAmt
                        const label =
                            methodLabel(rec.payment_method) !== rec.payment_method
                                ? methodLabel(rec.payment_method)
                                : (tenderMap.get(rec.payment_method)?.label ?? rec.payment_method)
                        return (
                            <div key={rec.payment_method} className="rounded-lg border overflow-hidden flex flex-col">
                                <div className="flex flex-col px-4 py-3 gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-sm font-medium">{label}</span>
                                            {hasPrev && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
                                                    prev.
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs uppercase tracking-wide text-muted-foreground">max {fmt(maxAmt)}</span>
                                    </div>
                                    <div className="relative">
                                        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 select-none text-sm">₱</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="pl-7 text-right tabular-nums"
                                            value={otherAmounts[rec.payment_method] ?? ''}
                                            onChange={(e) => onOtherAmountChange(rec.payment_method, e.target.value)}
                                            onBlur={(e) => { const v = toTwoDecimals(e.target.value); if (v) onOtherAmountChange(rec.payment_method, v) }}
                                        />
                                    </div>
                                    {hasPrev && (
                                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                            <div className="flex justify-between">
                                                <span>Today</span>
                                                <span className="tabular-nums">{fmt(Number(rec.total))}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Previous day</span>
                                                <span className="tabular-nums text-amber-700">+ {fmt(prevAmt)}</span>
                                            </div>
                                        </div>
                                    )}
                                    {exceedsPOS && (
                                        <p className="flex items-center gap-1 text-xs text-amber-700">
                                            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                            Exceeds POS total — override required
                                        </p>
                                    )}
                                </div>
                                {hasPrev && (
                                    <div className="border-t border-amber-200 bg-amber-50/60 px-4 py-2 text-xs text-amber-700">
                                        Previous day unremitted amounts. Adjust if collecting partial only.
                                    </div>
                                )}
                            </div>
                        )
                    })}

                {/* Partial: prev-only tender cards (yesterday's sales absent from today's POS) */}
                {remitType === 'partial' && prevOnlyTenders.map((rec) => {
                    const label =
                        methodLabel(rec.payment_method) !== rec.payment_method
                            ? methodLabel(rec.payment_method)
                            : (tenderMap.get(rec.payment_method)?.label ?? rec.payment_method)
                    return (
                        <div key={rec.payment_method} className="rounded-lg border border-amber-200 overflow-hidden flex flex-col">
                            <div className="flex flex-col px-4 py-3 gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{label}</span>
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
                                            prev.
                                        </span>
                                    </div>
                                    <span className="text-xs uppercase tracking-wide text-muted-foreground">max {fmt(Number(rec.total))}</span>
                                </div>
                                <div className="relative">
                                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 select-none text-sm">₱</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-7 text-right tabular-nums"
                                        value={otherAmounts[rec.payment_method] ?? rec.total}
                                        onChange={(e) => onOtherAmountChange(rec.payment_method, e.target.value)}
                                        onBlur={(e) => { const v = toTwoDecimals(e.target.value); if (v) onOtherAmountChange(rec.payment_method, v) }}
                                    />
                                </div>
                            </div>
                            <div className="border-t border-amber-200 bg-amber-50/60 px-4 py-2 text-xs text-amber-700">
                                Previous day unremitted amounts. Adjust if collecting partial only.
                            </div>
                        </div>
                    )
                })}

                {submitError && (
                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {submitError}
                    </p>
                )}

                <Button className="w-full" onClick={onSubmit} disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing…
                        </>
                    ) : (
                        'Submit Remittance'
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
