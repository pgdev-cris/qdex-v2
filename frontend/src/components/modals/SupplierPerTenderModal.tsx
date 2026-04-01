import { useState } from 'react'
import * as XLSX from 'xlsx'
import { X, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PivotedRow {
    supplier_code: number
    supplier_name: string
    event_code: string
    event_name: string
    tenders: Record<string, number>  // tender_name → total
    grand_total: number
}

interface ApiReport {
    tender_names: string[]
    rows: PivotedRow[]
}

interface Filters {
    from: string
    to: string
    supplier_code: string
    status: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileSuffix(filters: Filters) {
    const today = new Date().toISOString().slice(0, 10)
    return filters.from && filters.to ? `_${filters.from}_to_${filters.to}` : `_${today}`
}

function exportToExcel(report: ApiReport, filters: Filters) {
    const { tender_names, rows } = report

    const sheetData = rows.map((r) => {
        const base: Record<string, string | number> = {
            'Event Code':    r.event_code,
            'Event Name':    r.event_name,
            'Supplier Code': r.supplier_code,
            'Supplier Name': r.supplier_name,
        }
        // Dynamic tender columns — one per tender type from tbl_tender_types
        for (const name of tender_names) {
            base[name] = Number(r.tenders[name] ?? 0)
        }
        base['Grand Total'] = Number(r.grand_total)
        return base
    })

    // Totals row at the bottom
    const totalsRow: Record<string, string | number> = {
        'Event Code':    '',
        'Event Name':    '',
        'Supplier Code': '',
        'Supplier Name': 'TOTAL',
    }
    for (const name of tender_names) {
        totalsRow[name] = rows.reduce((sum, r) => sum + Number(r.tenders[name] ?? 0), 0)
    }
    totalsRow['Grand Total'] = rows.reduce((sum, r) => sum + Number(r.grand_total), 0)
    sheetData.push(totalsRow)

    const ws = XLSX.utils.json_to_sheet(sheetData)

    // Fixed cols + one per tender + Grand Total
    ws['!cols'] = [
        { wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 30 },
        ...tender_names.map(() => ({ wch: 16 })),
        { wch: 16 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Supplier Per Tender')
    XLSX.writeFile(wb, `supplier_per_tender${fileSuffix(filters)}.xlsx`)
}

// ── Field helpers ─────────────────────────────────────────────────────────────

const inputCls =
    'rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean
    onClose: () => void
}

const BLANK: Filters = { from: '', to: '', supplier_code: '', status: '' }

export function SupplierPerTenderModal({ open, onClose }: Props) {
    const today = new Date().toISOString().slice(0, 10)
    const [filters, setFilters] = useState<Filters>({ ...BLANK, from: today, to: today })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [resultCount, setResultCount] = useState<number | null>(null)

    if (!open) return null

    function patch(key: keyof Filters, value: string) {
        setFilters((f) => ({ ...f, [key]: value }))
        setError(null)
        setResultCount(null)
    }

    async function handleGenerate() {
        setLoading(true)
        setError(null)
        setResultCount(null)
        try {
            const p: Record<string, string> = {}
            if (filters.from)          p.from          = filters.from
            if (filters.to)            p.to            = filters.to
            if (filters.supplier_code) p.supplier_code = filters.supplier_code.trim()
            if (filters.status)        p.status        = filters.status

            const res = await apiClient.get<{ data: ApiReport }>(
                '/api/v1/reports/supplier-per-tender',
                { params: p },
            )
            const report = res.data.data
            if (!report.rows.length) { setError('No data found for the selected filters.'); return }
            setResultCount(report.rows.length)
            exportToExcel(report, filters)
        } catch (e: unknown) {
            setError((e as { message?: string })?.message ?? 'Failed to generate report.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50" />
            <div
                className="relative z-10 w-[480px] rounded-xl border bg-card p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-card-foreground">Supplier Per Tender</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Totals grouped by supplier × event, broken down per tender type.
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Date From</label>
                        <input type="date" value={filters.from} onChange={(e) => patch('from', e.target.value)} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Date To</label>
                        <input type="date" value={filters.to} onChange={(e) => patch('to', e.target.value)} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Supplier Code</label>
                        <input type="number" placeholder="e.g. 12345" value={filters.supplier_code} onChange={(e) => patch('supplier_code', e.target.value)} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Status</label>
                        <select value={filters.status} onChange={(e) => patch('status', e.target.value)} className={inputCls}>
                            <option value="">All Statuses</option>
                            <option value="0">Pending</option>
                            <option value="1">Verified</option>
                            <option value="2">Voided</option>
                        </select>
                    </div>
                </div>

                {/* Feedback */}
                {error && <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
                {resultCount !== null && !error && (
                    <p className="mt-3 rounded-md bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
                        {resultCount} supplier row{resultCount !== 1 ? 's' : ''} exported successfully.
                    </p>
                )}

                {/* Actions */}
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Close</Button>
                    <Button size="sm" onClick={handleGenerate} disabled={loading}>
                        {loading ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</> : <><Download className="mr-1.5 h-3.5 w-3.5" />Generate Excel</>}
                    </Button>
                </div>
            </div>
        </div>
    )
}
