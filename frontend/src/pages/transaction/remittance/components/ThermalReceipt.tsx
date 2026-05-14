import type { Receipt } from '../types'
import { fmtAmt, fmtReceiptDate } from '../helpers'
import { COMPANY_NAME, RECEIPT_TITLE } from '../constants'
import React from 'react'
import { toTitleCase } from '@/utils/string.utils.ts'
import { tenderLabelByCode } from '@/constants/tender.constants'

//  Helpers
const Row = ({ label, value }: { label: string; value: string }) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    )
}

const Divider = ({ style }: { style?: React.CSSProperties }) => {
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

const Signature = ({
    name,
    label,
    style,
    marginTop = '40px',
    marginBottom = '40px',
}: {
    name: string
    label: string
    style?: React.CSSProperties
    marginTop?: string
    marginBottom?: string
}) => {
    return (
        <>
            <div style={{ ...gap, textAlign: 'center', marginTop, ...style }}>
                {toTitleCase(name)}
            </div>
            <div style={{ textAlign: 'center', marginTop: '-8px', marginBottom: '-8px' }}>
                {'_'.repeat(30)}
            </div>
            <div style={{ ...gap, textAlign: 'center', marginBottom, fontWeight: 'bold' }}>
                {label}
            </div>
        </>
    )
}

const DividerSolid = ({ style }: { style?: React.CSSProperties }) => {
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

const CopyBlock = ({ receipt, copyLabel }: { receipt: Receipt; copyLabel: string }) => {
    const cashLines = receipt.lines.filter((l) => l.method === 'CASH')
    const cardLines = receipt.lines.filter((l) => l.method !== 'CASH')
    const cashTotal = cashLines.reduce((s, l) => s + Number(l.amount), 0)
    const cardsTotal = cardLines.reduce((s, l) => s + Number(l.amount), 0)
    const grandTotal = receipt.lines.reduce((s, l) => s + Number(l.amount), 0)

    return (
        <div style={{ position: 'relative' }}>
            {/* Void watermark — only renders when the underlying transaction
                is voided. Positioned behind all content via z-index:0 so the
                rest of the receipt prints normally on top of it. */}
            {receipt.is_voided && (
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-25deg)',
                        fontWeight: 'bold',
                        fontSize: '72pt',
                        color: '#000',
                        opacity: 0.12,
                        pointerEvents: 'none',
                        zIndex: 0,
                        letterSpacing: '6pt',
                        whiteSpace: 'nowrap',
                    }}
                >
                    VOID
                </div>
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '8pt', lineHeight: '1.6' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>{COMPANY_NAME}</div>
                    <div>{receipt.event_name}</div>
                    <div>{RECEIPT_TITLE}</div>
                    <div style={{ fontWeight: 'bold' }}>
                        {receipt.remit_type === 'partial'
                            ? 'PARTIAL REMITTANCE'
                            : receipt.remit_type === 'manual'
                              ? 'MANUAL REMITTANCE'
                              : 'FULL REMITTANCE'}
                    </div>
                    <div style={{ fontWeight: 'bold' }}>{copyLabel}</div>
                    {receipt.is_prev_sales_only && (
                        <div
                            style={{
                                marginTop: '6pt',
                                fontWeight: 'bold',
                                fontSize: '10pt',
                                letterSpacing: '2pt',
                            }}
                        >
                            *** UNREMITTED SALES ***
                        </div>
                    )}
                    {receipt.is_voided && (
                        <div
                            style={{
                                marginTop: '6pt',
                                fontWeight: 'bold',
                                fontSize: '14pt',
                                letterSpacing: '4pt',
                            }}
                        >
                            *** VOID — NOT VALID ***
                        </div>
                    )}
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
                    {receipt.remitter_name && (
                        <div>Remitter: {toTitleCase(receipt.remitter_name)}</div>
                    )}
                </div>

                <Divider />

                {/* Remittance Details */}
                <div style={{ fontWeight: 'bold' }}>Remittance Details:</div>

                {/* Cash Breakdown */}
                {cashLines.length > 0 && (
                    <div style={{ ...gapSm, lineHeight: '1.8' }}>
                        {cashLines.map((l, i) => (
                            <Row
                                key={`cash-${i}`}
                                label={`  Cash${l.is_prev_sales ? ' (prev.)' : ''} Total:`}
                                value={fmtAmt(l.amount)}
                            />
                        ))}
                    </div>
                )}

                {/* Online Payments Breakdown */}
                {cardLines.length > 0 && (
                    <div style={{ ...gapSm, lineHeight: '1.8' }}>
                        <div style={{ fontWeight: 'bold' }}>Online Payments Breakdown</div>
                        {cardLines.map((l, i) => (
                            <div
                                key={`${l.method}-${i}`}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginLeft: '8px',
                                }}
                            >
                                <span> {tenderLabelByCode(l.method)}{l.is_prev_sales ? ' (prev.)' : ''}</span>
                                <span>{fmtAmt(l.amount)}</span>
                            </div>
                        ))}
                        <Row label="  Online Payments Total:" value={fmtAmt(cardsTotal)} />
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
                <Signature name={receipt.printed_by} label="Printed By" />
                <Signature name={receipt.remitter_name} label="Acknowledged By" />

                <DividerSolid />

                <div style={gapSm}>Gen Date: {fmtReceiptDate(new Date())}</div>
            </div>
        </div>
    )
}

//  Thermal receipt wrapper (print-only)
interface Props {
    receipt: Receipt
}

export const ThermalReceipt = ({ receipt }: Props) => {
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
                        font-size: 12pt;
                        color: #000;
                        line-height: 1.6;
                    }

                    #qdex-thermal * { visibility: visible !important; }
                }
            `}</style>

            <div id="qdex-thermal">
                {/* TRS Copy — page break pushes Supplier Copy to next sheet */}
                <div style={receipt.is_voided ? undefined : { pageBreakAfter: 'always', breakAfter: 'page' }}>
                    <CopyBlock receipt={receipt} copyLabel="TRS Copy" />
                </div>

                {/* Supplier Copy — omitted for voided receipts */}
                {!receipt.is_voided && (
                    <div>
                        <CopyBlock receipt={receipt} copyLabel="Supplier Copy" />
                    </div>
                )}
            </div>
        </>
    )
}
