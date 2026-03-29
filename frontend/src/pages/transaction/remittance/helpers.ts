/** Amount without currency symbol: 12,345.67 */
export function fmtAmt(val: string | number): string {
    return Number(val).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

/** Amount with ₱ symbol for on-screen display */
export function fmt(val: string | number): string {
    return Number(val).toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    })
}

/** "Mar. 23,2026 11:09:11" */
export function fmtReceiptDate(d: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `${months[d.getMonth()]}. ${d.getDate()},${d.getFullYear()} ${h}:${m}:${s}`
}

export function genTransIds(): { transNo: string; refCode: string } {
    const ts = Date.now()
    const transNo = String(ts).slice(-6)
    const refCode =
        ts.toString(36).slice(-4).toUpperCase() +
        Math.random().toString(36).slice(2, 4).toUpperCase()
    return { transNo, refCode }
}

export function methodLabel(code: string): string {
    const map: Record<string, string> = {
        CASH: 'Cash',
        GCASH: 'GCash',
        PWALLET: 'PWALLET',
        CREDIT_CARD: 'CREDIT CARD',
    }
    return map[code] ?? code
}
