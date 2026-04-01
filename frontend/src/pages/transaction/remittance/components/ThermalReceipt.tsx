import type { Receipt } from '../types'
import { fmtAmt, fmtReceiptDate, methodLabel } from '../helpers'
import { COMPANY_NAME, RECEIPT_TITLE } from '../constants'
import React from 'react'

//  Helpers
function Row({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    )
}

function Divider({ style }: { style?: React.CSSProperties }) {
    return (
        <hr
            style={{
                border: 'none',
                borderTop: '1px dashed #000',
                margin: '5pt 0',
                ...style,
            }}
        />
    )
}

function DividerSolid({ style }: { style?: React.CSSProperties }) {
    return (
        <hr
            style={{
                border: 'none',
                borderTop: '1px solid #000',
                margin: '5pt 0',
                ...style,
            }}
        />
    )
}

//  Single copy block
const gap = { marginTop: '8pt' }
const gapSm = { marginTop: '5pt' }

function CopyBlock({ receipt, copyLabel }: { receipt: Receipt; copyLabel: string }) {
    const cashLine = receipt.lines.find((l) => l.method === 'CASH')
    const cardLines = receipt.lines.filter((l) => l.method !== 'CASH')
    const cashTotal = Number(cashLine?.amount ?? 0)
    const cardsTotal = cardLines.reduce((s, l) => s + Number(l.amount), 0)
    const grandTotal = receipt.lines.reduce((s, l) => s + Number(l.amount), 0)

    return (
        <div>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '8pt', lineHeight: '1.6' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>{COMPANY_NAME}</div>
                <div>{receipt.event_name}</div>
                <div>{RECEIPT_TITLE}</div>
                <div style={{ fontWeight: 'bold' }}>{copyLabel}</div>
            </div>

            <Divider />

            {/* Transaction info */}
            <div style={{ lineHeight: '1.8' }}>
                <Row label="Trans No:" value={receipt.trans_no} />
                <div>Verified Date: {receipt.verified_at}</div>
                <Row label="Ref Code:" value={receipt.ref_code} />
                <Row label="Event Code:" value={receipt.event_code} />
                <div>
                    Supplier: ({receipt.supplier_code})
                    {receipt.supplier_name ? ` ${receipt.supplier_name}` : ''}
                </div>
                {receipt.remitter_name && <div>Remitter: {receipt.remitter_name}</div>}
            </div>

            <Divider />

            {/* Remittance Details */}
            <div style={{ fontWeight: 'bold' }}>Remittance Details:</div>

            {/* Cash Breakdown */}
            {cashLine && (
                <div style={{ ...gapSm, lineHeight: '1.8' }}>
                    <div style={{ fontWeight: 'bold' }}>Cash Breakdown</div>
                    <Row label="  Cash:" value={fmtAmt(cashTotal)} />
                </div>
            )}

            {/* Cards Breakdown */}
            {cardLines.length > 0 && (
                <div style={{ ...gapSm, lineHeight: '1.8' }}>
                    <div style={{ fontWeight: 'bold' }}>Cards Breakdown</div>
                    {cardLines.map((l) => (
                        <div
                            key={l.method}
                            style={{ display: 'flex', justifyContent: 'space-between' }}
                        >
                            <span> {methodLabel(l.method)}</span>
                            <span>{fmtAmt(l.amount)}</span>
                        </div>
                    ))}
                    <Row label="  Cards Total:" value={fmtAmt(cardsTotal)} />
                </div>
            )}

            <Divider />

            {/* Total */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 'bold',
                    fontSize: '12pt',
                }}
            >
                <span>TOTAL:</span>
                <span>{fmtAmt(grandTotal)}</span>
            </div>

            <DividerSolid />

            {/* Signatures */}
            <div style={{ ...gap, textAlign: 'center', marginTop: '40px' }}>
                {receipt.printed_by}
            </div>
            <div style={{ textAlign: 'center', marginTop: '-8px', marginBottom: '-8px' }}>
                {'_'.repeat(30)}
            </div>
            <div style={{ ...gap, textAlign: 'center' }}>Printed by</div>

            <div style={{ ...gap, textAlign: 'center', marginTop: '40px' }}>
                {receipt.remitter_name}
            </div>
            <div style={{ textAlign: 'center', marginTop: '-8px', marginBottom: '-8px' }}>
                {'_'.repeat(30)}
            </div>
            <div style={{ ...gap, textAlign: 'center', marginBottom: '40px' }}>Acknowledged by</div>

            <DividerSolid />

            <div style={gapSm}>Gen Date: {fmtReceiptDate(new Date())}</div>
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
                        padding: 0.18in 0.16in;
                        box-sizing: border-box;
                        background: #fff;
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 10.5pt;
                        color: #000;
                        line-height: 1.6;
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
