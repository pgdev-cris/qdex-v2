import { RotateCcw, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { SalesRecord, RemitType } from '../types'
import { fmt, methodLabel } from '../helpers'

interface Props {
    remitType: RemitType
    supplierCode: string
    supplierName: string
    salesData: SalesRecord[]
    cashRecord: SalesRecord | undefined
    cashAmount: string
    submitError: string | null
    loading: boolean
    onCashChange: (value: string) => void
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
    submitError,
    loading,
    onCashChange,
    onSubmit,
    onBack,
}: Props) => {
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
                {/* Full: show all payment rows */}
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
                                    className="flex items-center justify-between px-4 py-3"
                                >
                                    <span className="text-sm font-medium">
                                        {methodLabel(rec.payment_method)}
                                    </span>
                                    {rec.payment_method === 'CASH' ? (
                                        <span className="text-muted-foreground text-xs italic">
                                            (editable below)
                                        </span>
                                    ) : (
                                        <span className="text-sm">{fmt(rec.total)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
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
