import { RotateCcw, AlertCircle, Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { SalesRecord, RemitType, PartialSummary } from '../types'
import { fmt, methodLabel } from '../helpers'

interface Props {
    remitType: RemitType
    supplierCode: string
    supplierName: string
    salesData: SalesRecord[]
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
}

export const RemittanceForm = ({
    remitType,
    supplierCode,
    supplierName,
    salesData,
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
}: Props) => {
    const posCashTotal = Number(cashRecord?.total ?? 0)
    const totalPartial = partialSummary?.total_cash ?? 0
    const balance = Math.max(0, posCashTotal - totalPartial)
    const hasPartial = (partialSummary?.count ?? 0) > 0

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
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="text-muted-foreground"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Back
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
                {/* Full: show all payment rows — non-CASH are now editable */}
                {remitType === 'full' && (
                    <div className="rounded-lg border">
                        <div className="px-4 py-2.5">
                            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                Payment Summary
                            </p>
                        </div>
                        <Separator />
                        <div className="divide-y">
                            {salesData.map((rec) => (
                                <div
                                    key={rec.payment_method}
                                    className="flex items-center justify-between px-4 py-3 gap-4"
                                >
                                    <span className="text-sm font-medium shrink-0">
                                        {methodLabel(rec.payment_method)}
                                    </span>
                                    {rec.payment_method === 'CASH' ? (
                                        <span className="text-muted-foreground text-xs italic">
                                            (editable below)
                                        </span>
                                    ) : (
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
                                                    otherAmounts[rec.payment_method] ?? rec.total
                                                }
                                                onChange={(e) =>
                                                    onOtherAmountChange(
                                                        rec.payment_method,
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                            Non-cash amounts are pre-filled from POS. Editing them requires override
                            approval.
                        </div>
                    </div>
                )}

                {/* Full: cash balance breakdown — shows partial deductions per transaction */}
                {remitType === 'full' && (
                    <div className="rounded-lg border">
                        <div className="px-4 py-2.5">
                            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                Cash Balance
                            </p>
                        </div>
                        <Separator />

                        {partialSummaryLoading ? (
                            <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Loading partial remittances…
                            </div>
                        ) : (
                            <div className="flex flex-col text-sm">
                                {/* POS cash total */}
                                <div className="flex items-center justify-between px-4 py-3 border-b">
                                    <span className="text-muted-foreground">Cash Sales (POS)</span>
                                    <span className="tabular-nums font-semibold">
                                        {fmt(posCashTotal)}
                                    </span>
                                </div>

                                {/* Individual partial transactions */}
                                {hasPartial && (
                                    <>
                                        <div className="px-4 pt-2.5 pb-1">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                Less: Partial Remitted ({partialSummary!.count}×)
                                            </p>
                                        </div>
                                        {partialSummary!.transactions.map((tx) => (
                                            <div
                                                key={tx.receipt_no}
                                                className="flex items-center justify-between px-4 py-2 border-b last:border-b-0"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-xs">
                                                        {tx.receipt_no}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {tx.reference_code}
                                                    </span>
                                                </div>
                                                <span className="tabular-nums text-destructive font-medium">
                                                    − {fmt(tx.cash_amount)}
                                                </span>
                                            </div>
                                        ))}
                                        {/* Partial subtotal */}
                                        <div className="flex items-center justify-between px-4 py-2 border-b bg-destructive/5">
                                            <span className="text-xs text-destructive font-medium">
                                                Total Partial Remitted
                                            </span>
                                            <span className="tabular-nums text-destructive font-semibold">
                                                − {fmt(totalPartial)}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* Balance row */}
                                <div className="flex items-center justify-between px-4 py-3 bg-muted/40 rounded-b-lg">
                                    <span className="font-semibold">
                                        {hasPartial ? 'Balance to Remit' : 'Cash to Remit'}
                                    </span>
                                    <span
                                        className={`tabular-nums font-semibold ${
                                            balance <= 0 ? 'text-muted-foreground' : 'text-primary'
                                        }`}
                                    >
                                        {fmt(balance)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Partial: current cash total */}
                {remitType === 'partial' && cashRecord && (
                    <div className="rounded-lg bg-muted/50 px-4 py-3">
                        <p className="text-muted-foreground text-xs">Current Cash Total</p>
                        <p className="mt-0.5 text-lg font-semibold tabular-nums">
                            {fmt(cashRecord.total)}
                        </p>
                    </div>
                )}

                {/* Cash amount input */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">
                        Cash Amount to Remit
                        {remitType === 'partial' && (
                            <span className="text-muted-foreground ml-1 font-normal">
                                (max {fmt(cashRecord?.total ?? 0)})
                            </span>
                        )}
                    </label>
                    <div className="relative">
                        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 select-none text-sm">
                            ₱
                        </span>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-7 text-right tabular-nums"
                            value={cashAmount}
                            onChange={(e) => onCashChange(e.target.value)}
                        />
                    </div>
                    {submitError && (
                        <p className="flex items-center gap-1.5 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {submitError}
                        </p>
                    )}
                </div>

                {cashOverrideNeeded && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                            {remitType === 'full'
                                ? 'Cash amount differs from the computed balance. Override approval is required to proceed.'
                                : 'Cash amount exceeds current sales total. Override approval is required to proceed.'}
                        </span>
                    </div>
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
