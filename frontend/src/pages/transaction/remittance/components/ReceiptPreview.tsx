import { CheckCircle2, Printer, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Receipt } from '../types'
import { fmtAmt } from '../helpers'
import { COMPANY_NAME, RECEIPT_TITLE } from '../constants'
import { toTitleCase } from '@/utils/string.utils.ts'
import { tenderLabelByCode } from '@/constants/tender.constants'

//  Screen-only receipt row

const ScreenRow = ({
    label,
    value,
    bold = false,
}: {
    label: string
    value: string
    bold?: boolean
}) => {
    return (
        <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    )
}

//  Component

interface Props {
    receipt: Receipt
    onPrint: () => void
    onReset: () => void
}

export const ReceiptPreview = ({ receipt, onPrint, onReset }: Props) => {
    const cashLine = receipt.lines.find((l) => l.method === 'CASH')
    const cardLines = receipt.lines.filter((l) => l.method !== 'CASH')
    const grandTotal = receipt.lines.reduce((s, l) => s + Number(l.amount), 0)
    const cardsTotal = cardLines.reduce((s, l) => s + Number(l.amount), 0)

    return (
        <Card>
            <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Remittance Successful</CardTitle>
                <CardDescription>
                    Trans No.{' '}
                    <span className="font-mono font-medium text-foreground">
                        {receipt.trans_no}
                    </span>
                </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
                {/* On-screen receipt */}
                <div className="relative overflow-hidden rounded-lg border bg-white">
                    {/* Void watermark — only shown when the underlying transaction
                        is voided. Sits behind the rest of the receipt content so
                        a reprinted voided copy cannot be mistaken for valid. */}
                    {receipt.is_voided && (
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
                            style={{
                                fontWeight: 'bold',
                                fontSize: '72pt',
                                color: '#000',
                                opacity: 0.1,
                                transform: 'rotate(-25deg)',
                                letterSpacing: '6pt',
                            }}
                        >
                            VOID
                        </div>
                    )}

                    <div className="relative z-10">
                        {/* Header band */}
                        <div className="border-b bg-muted/40 px-5 py-3 text-center font-mono text-xs leading-5">
                            <p className="font-bold">{COMPANY_NAME}</p>
                            <p>{receipt.event_name}</p>
                            <p>{RECEIPT_TITLE}</p>
                            <p className="font-bold">
                                {receipt.remit_type === 'partial'
                                    ? 'PARTIAL REMITTANCE'
                                    : 'FULL REMITTANCE'}
                            </p>
                            <p>Supplier Copy</p>
                            {receipt.is_voided && (
                                <p
                                    className="mt-2 border-2 border-black py-1 font-bold tracking-widest"
                                    style={{ fontSize: '14pt' }}
                                >
                                    *** VOID — NOT VALID ***
                                </p>
                            )}
                        </div>

                        <div className="px-5 py-4 font-mono text-xs leading-5">
                            <ScreenRow label="Trans No:" value={receipt.trans_no} />
                            <div className="text-[11px]">Verified Date: {receipt.verified_at}</div>
                            <ScreenRow label="Ref Code:" value={receipt.ref_code} />
                            <ScreenRow label="Event Code:" value={receipt.event_code} />
                            <div>
                                Supplier: ({receipt.supplier_code})
                                {receipt.supplier_name ? ` ${receipt.supplier_name}` : ''}
                            </div>
                            {receipt.remitter_name && (
                                <div>Remitter: {toTitleCase(receipt.remitter_name)}</div>
                            )}

                            <Separator className="my-2" />

                            <p className="mb-1 font-semibold">Remittance Details:</p>

                            {cashLine && (
                                <div className="mb-2">
                                    <ScreenRow
                                        label="  Cash Total:"
                                        value={fmtAmt(cashLine.amount)}
                                    />
                                </div>
                            )}

                            {cardLines.length > 0 && (
                                <div className="mb-2">
                                    <p>Online Payments Breakdown</p>
                                    {cardLines.map((l) => (
                                        <div key={l.method} className="flex justify-between ml-4">
                                            <span>{tenderLabelByCode(l.method)}</span>
                                            <span>{fmtAmt(l.amount)}</span>
                                        </div>
                                    ))}
                                    <ScreenRow
                                        label="  Online Payments Total"
                                        value={fmtAmt(cardsTotal)}
                                    />
                                </div>
                            )}

                            <Separator className="my-2" />

                            <ScreenRow label="Total:" value={fmtAmt(grandTotal)} bold />

                            <Separator className="my-2" />

                            <div className="flex flex-col gap-2">
                                <div className="text-center mt-8">
                                    <p className="text-muted-foreground -mt-4">
                                        {toTitleCase(receipt.printed_by)}
                                    </p>
                                    <p className="-mt-2">{'_'.repeat(37)}</p>
                                    <p className="text-muted-foreground">Printed By</p>
                                </div>
                                <div className="text-center mt-8">
                                    <p className="text-muted-foreground">
                                        {toTitleCase(receipt.remitter_name)}
                                    </p>
                                    <p className="-mt-2">{'_'.repeat(37)}</p>
                                    <p className="text-muted-foreground">Acknowledged By</p>
                                </div>
                                <div></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onPrint}>
                        <Printer className="h-4 w-4" />
                        Print Receipt
                    </Button>
                    <Button className="flex-1" onClick={onReset}>
                        <RotateCcw className="h-4 w-4" />
                        New Transaction
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
