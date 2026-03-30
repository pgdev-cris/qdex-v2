import type { Receipt } from '../types'
import { fmtAmt, methodLabel } from '../helpers'
import { COMPANY_NAME, RECEIPT_TITLE, LINE_DASHES, LINE_EQUALS } from '../constants'

//  Row helper

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    )
}

//  Single copy block

function CopyBlock({ receipt, copyLabel }: { receipt: Receipt; copyLabel: string }) {
    const cashLine = receipt.lines.find((l) => l.method === 'CASH')
    const cardLines = receipt.lines.filter((l) => l.method !== 'CASH')
    const cashTotal = Number(cashLine?.amount ?? 0)
    const cardsTotal = cardLines.reduce((s, l) => s + Number(l.amount), 0)
    const grandTotal = receipt.lines.reduce((s, l) => s + Number(l.amount), 0)

    return (
        <div>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '4pt', lineHeight: '1.4' }}>
                <div style={{ fontWeight: 'bold' }}>{COMPANY_NAME}</div>
                <div>{receipt.event_name}</div>
                <div>{RECEIPT_TITLE}</div>
                <div>{copyLabel}</div>
            </div>

            <div>{LINE_DASHES}</div>

            {/* Transaction info */}
            <div style={{ marginTop: '3pt' }}>
                <Row label="Trans No:" value={receipt.trans_no} />
                <div>Verified Date: {receipt.verified_at}</div>
                <Row label="Ref Code:" value={receipt.ref_code} />
                <Row label="Event Code:" value={receipt.event_code} />
                <div>
                    Supplier: ({receipt.vendor_code})
                    {receipt.vendor_name ? ` ${receipt.vendor_name}` : ''}
                </div>
                {receipt.remitter_name && <div>Remitter: {receipt.remitter_name}</div>}
            </div>

            {/* Payment Details */}
            <div style={{ marginTop: '4pt' }}>Payment Details:</div>

            {/* Cash Breakdown */}
            {cashLine && (
                <div style={{ marginTop: '2pt' }}>
                    <div>Cash Breakdown</div>
                    <Row label="  Cash Amt:" value={fmtAmt(cashTotal)} />
                </div>
            )}

            {/* Cards Breakdown */}
            {cardLines.length > 0 && (
                <div style={{ marginTop: '2pt' }}>
                    <div>Cards Breakdown</div>
                    {cardLines.map((l) => (
                        <div
                            key={l.method}
                            style={{ display: 'flex', justifyContent: 'space-between' }}
                        >
                            <span> {methodLabel(l.method)}</span>
                            <span>Amt: {fmtAmt(l.amount)}</span>
                        </div>
                    ))}
                    <Row label="  Cards Amt:" value={fmtAmt(cardsTotal)} />
                </div>
            )}

            {/* Total */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '3pt',
                    fontWeight: 'bold',
                }}
            >
                <span>Total:</span>
                <span>{fmtAmt(grandTotal)}</span>
            </div>

            <div style={{ marginTop: '4pt' }}>{LINE_EQUALS}</div>

            {/* Signatures */}
            <div style={{ marginTop: '3pt', textAlign: 'center' }}>Trs User</div>
            <div style={{ textAlign: 'center' }}>{'_'.repeat(39)}</div>

            <div style={{ marginTop: '4pt', textAlign: 'center' }}>
                Printed by {receipt.printed_by}
            </div>
            <div style={{ textAlign: 'center' }}>{'_'.repeat(39)}</div>

            <div style={{ marginTop: '4pt' }}>Acknowledge by: {receipt.printed_by}</div>

            <div style={{ marginTop: '4pt' }}>{LINE_EQUALS}</div>

            <div style={{ marginTop: '3pt' }}>Gen Date: # {receipt.gen_at}</div>
        </div>
    )
}

//  Thermal receipt wrapper (print-only)

interface Props {
    receipt: Receipt
}

export function ThermalReceipt({ receipt }: Props) {
    return (
        <>
            <style>{`
                #qdex-thermal { display: none; }

                @media print {
                    @page { size: 4.25in auto; margin: 0; }

                    body * { visibility: hidden !important; }

                    #qdex-thermal {
                        display: block !important;
                        visibility: visible !important;
                        position: absolute !important;
                        top: 0; left: 0;
                        width: 4.25in;
                        padding: 0.12in 0.14in;
                        box-sizing: border-box;
                        background: #fff;
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 8pt;
                        color: #000;
                        line-height: 1.35;
                    }

                    #qdex-thermal * { visibility: visible !important; }
                }
            `}</style>

            <div id="qdex-thermal">
                {/* TRS Copy — page break pushes Supplier Copy to next sheet */}
                <div style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
                    <CopyBlock receipt={receipt} copyLabel="TRS Copy" />
                </div>

                {/* Supplier Copy */}
                <div>
                    <CopyBlock receipt={receipt} copyLabel="Supplier Copy" />
                </div>
            </div>
        </>
    )
}
