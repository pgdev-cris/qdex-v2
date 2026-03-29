import { useState } from 'react'
import { CalendarDays, Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal, DeleteModal, FormField, FormRow, FormSelect } from '@/components/ui/modal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Event {
    id: number
    code: string
    name: string
    category: string
    location: string
    start_date: string
    end_date: string
    status: 'Upcoming' | 'Active' | 'Completed' | 'Cancelled'
}

const BLANK: Omit<Event, 'id'> = {
    code: '',
    name: '',
    category: '',
    location: '',
    start_date: '',
    end_date: '',
    status: 'Upcoming',
}

const STATUS_OPTIONS = ['Upcoming', 'Active', 'Completed', 'Cancelled'] as const

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Event['status'] }) {
    const styles: Record<Event['status'], string> = {
        Upcoming: 'bg-blue-50 text-blue-600',
        Active: 'bg-primary/10 text-primary',
        Completed: 'bg-muted text-muted-foreground',
        Cancelled: 'bg-destructive/10 text-destructive',
    }
    return (
        <span
            className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                styles[status],
            ].join(' ')}
        >
            {status}
        </span>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const COLUMNS = ['Code', 'Event Name', 'Category', 'Location', 'Start', 'End', 'Status', 'Actions']

export function EventsPage() {
    const [rows, setRows] = useState<Event[]>([])
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data: Omit<Event, 'id'>; id?: number } | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)
    const [nextId, setNextId] = useState(1)

    // ── Helpers ───────────────────────────────────────────────────────────────

    const filtered = rows.filter((r) => {
        const q = search.toLowerCase()
        return (
            r.code.toLowerCase().includes(q) ||
            r.name.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q) ||
            r.location.toLowerCase().includes(q)
        )
    })

    function openAdd() {
        setModal({ mode: 'add', data: { ...BLANK } })
    }

    function openEdit(event: Event) {
        const { id, ...data } = event
        setModal({ mode: 'edit', data, id })
    }

    function setField<K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) {
        setModal((m) => m ? { ...m, data: { ...m.data, [key]: value } } : m)
    }

    function handleSave() {
        if (!modal) return
        const { name, code } = modal.data
        if (!name.trim() || !code.trim()) return

        if (modal.mode === 'add') {
            setRows((r) => [...r, { id: nextId, ...modal.data }])
            setNextId((n) => n + 1)
        } else {
            setRows((r) => r.map((row) => row.id === modal.id ? { ...row, ...modal.data } : row))
        }
        setModal(null)
    }

    function handleDelete() {
        if (!deleteTarget) return
        setRows((r) => r.filter((row) => row.id !== deleteTarget.id))
        setDeleteTarget(null)
    }

    function fmtDate(d: string) {
        if (!d) return '—'
        return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <CalendarDays className="text-muted-foreground h-5 w-5" />
                        Events
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Create and manage system events and schedules.
                    </p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="h-4 w-4" />
                    Create Event
                </Button>
            </div>

            {/* Table card */}
            <Card>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle>Event List</CardTitle>
                            <CardDescription>
                                {rows.length} {rows.length === 1 ? 'event' : 'events'} total.
                            </CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                            <Input
                                placeholder="Search events..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                {COLUMNS.map((col) => (
                                    <th
                                        key={col}
                                        className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wide"
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={COLUMNS.length}
                                        className="text-muted-foreground py-16 text-center text-sm"
                                    >
                                        {search ? 'No events match your search.' : 'No events yet. Click Create Event to get started.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((event) => (
                                    <tr key={event.id} className="border-b last:border-0 hover:bg-muted/40">
                                        <td className="px-4 py-3 font-mono text-xs font-medium">{event.code}</td>
                                        <td className="px-4 py-3 font-medium">{event.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{event.category || '—'}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{event.location || '—'}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(event.start_date)}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(event.end_date)}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={event.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => openEdit(event)}
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => setDeleteTarget(event)}
                                                    title="Delete"
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Add / Edit modal */}
            <Modal
                open={modal !== null}
                onClose={() => setModal(null)}
                title={modal?.mode === 'add' ? 'Create Event' : 'Edit Event'}
                description="Fill in the event details below."
                footer={
                    <>
                        <Button variant="outline" onClick={() => setModal(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {modal?.mode === 'add' ? 'Create Event' : 'Save Changes'}
                        </Button>
                    </>
                }
            >
                {modal && (
                    <div className="flex flex-col gap-4">
                        <FormRow>
                            <FormField label="Event Code" required hint="e.g. TNAP-2025">
                                <Input
                                    placeholder="TNAP-2025"
                                    value={modal.data.code}
                                    onChange={(e) => setField('code', e.target.value.toUpperCase())}
                                    className="uppercase"
                                />
                            </FormField>
                            <FormField label="Status">
                                <FormSelect
                                    value={modal.data.status}
                                    onChange={(v) => setField('status', v as Event['status'])}
                                >
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </FormSelect>
                            </FormField>
                        </FormRow>
                        <FormField label="Event Name" required>
                            <Input
                                placeholder="TNAP Convention 2025"
                                value={modal.data.name}
                                onChange={(e) => setField('name', e.target.value)}
                            />
                        </FormField>
                        <FormRow>
                            <FormField label="Category">
                                <Input
                                    placeholder="Convention"
                                    value={modal.data.category}
                                    onChange={(e) => setField('category', e.target.value)}
                                />
                            </FormField>
                            <FormField label="Location">
                                <Input
                                    placeholder="Manila, Philippines"
                                    value={modal.data.location}
                                    onChange={(e) => setField('location', e.target.value)}
                                />
                            </FormField>
                        </FormRow>
                        <FormRow>
                            <FormField label="Start Date">
                                <Input
                                    type="date"
                                    value={modal.data.start_date}
                                    onChange={(e) => setField('start_date', e.target.value)}
                                />
                            </FormField>
                            <FormField label="End Date">
                                <Input
                                    type="date"
                                    value={modal.data.end_date}
                                    onChange={(e) => setField('end_date', e.target.value)}
                                />
                            </FormField>
                        </FormRow>
                    </div>
                )}
            </Modal>

            {/* Delete confirmation */}
            <DeleteModal
                open={deleteTarget !== null}
                label={deleteTarget?.name ?? ''}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}
