import { Request, Response } from 'express'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RemitLine {
    method: string
    amount: string | number
}

interface RemitBody {
    vendor_code: string
    vendor_name?: string
    remitter_name?: string
    remit_type?: string
    lines?: RemitLine[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number, len = 2) {
    return String(n).padStart(len, '0')
}

function genCodes(isPartial: boolean) {
    const now = new Date()
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
    const seq = pad(Math.floor(Math.random() * 9999), 4)
    const prefix = isPartial ? 'PRT' : 'FUL'
    const receiptNo = `RCP-${date}-${seq}`
    const referenceCode = `${prefix}-${date}-${seq}`
    return { receiptNo, referenceCode }
}

function isoNow() {
    return new Date().toISOString()
}

// ─── Controllers ──────────────────────────────────────────────────────────────

const partialRemitRequest = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RemitBody

    if (!body?.vendor_code) {
        res.status(400).json({ result: 'error', message: 'vendor_code is required.' })
        return
    }

    const { receiptNo, referenceCode } = genCodes(true)
    const remittedAt = isoNow()

    res.status(200).json({
        result: 'success',
        message: 'Partial remittance recorded successfully.',
        data: {
            receipt_no: receiptNo,
            reference_code: referenceCode,
            vendor_code: body.vendor_code,
            vendor_name: body.vendor_name ?? '',
            remitter_name: body.remitter_name ?? '',
            remit_type: 'partial',
            lines: body.lines ?? [],
            remitted_at: remittedAt,
        },
    })
}

const fullRemitRequest = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RemitBody

    if (!body?.vendor_code) {
        res.status(400).json({ result: 'error', message: 'vendor_code is required.' })
        return
    }

    const { receiptNo, referenceCode } = genCodes(false)
    const remittedAt = isoNow()

    res.status(200).json({
        result: 'success',
        message: 'Full remittance recorded successfully.',
        data: {
            receipt_no: receiptNo,
            reference_code: referenceCode,
            vendor_code: body.vendor_code,
            vendor_name: body.vendor_name ?? '',
            remitter_name: body.remitter_name ?? '',
            remit_type: 'full',
            lines: body.lines ?? [],
            remitted_at: remittedAt,
        },
    })
}

export default { partialRemitRequest, fullRemitRequest }
