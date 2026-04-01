import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, Search, Plus, Pencil, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal, DeleteModal, FormField, FormRow } from '@/components/ui/modal'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import type { AppEvent } from '@/types/auth.types'

// Types

interface ApiListResponse {
    status: number
    message: string
    data: AppEvent[]
}

interface ApiSingleResponse {
    status: number
    message: string
    data: AppEvent
}

type FormData = Omit<AppEvent, 'id' | 'status'>

const BLANK: FormData = {
    name: '',
    code: '',
    period_start: '',
    period_end: '',
}

// Status badge

const StatusBadge = ({ status }: { status: 0 | 1 }) => {
    return status === 1 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Active
        </span>
    ) : (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Inactive
        </span>
    )
}

//  Page

const COLUMNS = ['Code', 'Event Name', 'Period Start', 'Period End', 'Status', 'Actions']

export const EventsPage = () => {
    const { currentEvent, setCurrentEvent } = useAuth()

    const [rows, setRows] = useState<AppEvent[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [modal, setModal] = useState<{
        mode: 'add' | 'edit'
        data: FormData
        id?: number
    } | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<AppEvent | null>(null)

    //  Fetch

    const fetchEvents = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await apiFetch<ApiListResponse>('/api/v1/events')
            setRows(res.data)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load events')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    //  Helpers

    const filtered = rows.filter((r) => {
        const q = search.toLowerCase()
        return r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    })

    const openAdd = () => {
        setModal({ mode: 'add', data: { ...BLANK } })
    }

    const openEdit = (event: AppEvent) => {
        setModal({
            mode: 'edit',
            id: event.id,
            data: {
                name: event.name,
                code: event.code,
                period_start: event.period_start ?? '',
                period_end: event.period_end ?? '',
            },
        })
    }

    const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
        setModal((m) => (m ? { ...m, data: { ...m.data, [key]: value } } : m))
    }

    //  Save (create / update)

    //  Save (create / update)
    const handleSave = async () => {
        if (!modal) return
        const { name, code } = modal.data
        if (!name.trim() || !code.trim()) return

        setSaving(true)
        setError(null)
        try {
            const payload = {
                name: modal.data.name.trim(),
                code: modal.data.code.trim().toUpperCase(),
                period_start: modal.data.period_start || undefined,
                period_end: modal.data.period_end || undefined,
            }

            if (modal.mode === 'add') {
                await apiFetch<ApiSingleResponse>('/api/v1/events', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                })
            } else {
                await apiFetch<ApiSingleResponse>(`/api/v1/events/${modal.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                })
            }

            setModal(null)
            await fetchEvents()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to save event')
        } finally {
            setSaving(false)
        }
    }

    //  Delete

    //  Delete
    const handleDelete = async () => {
        if (!deleteTarget) return
        setSaving(true)
        setError(null)
        try {
            await apiFetch(`/api/v1/events/${deleteTarget.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 0 }),
            })
            // Clear app-level event if it was the active one
            if (currentEvent?.id === deleteTarget.id) {
                setCurrentEvent(null)
            }
            setDeleteTarget(null)
            await fetchEvents()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to delete event')
        } finally {
            setSaving(false)
        }
    }

    //  Set Active

    //  Set Active
    const handleSetActive = async (event: AppEvent) => {
        setSaving(true)
        setError(null)
        try {
            const res = await apiFetch<ApiSingleResponse>(`/api/v1/events/${event.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 1 }),
            })
            // Update app-level current event
            setCurrentEvent(res.data)
            await fetchEvents()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to activate event')
        } finally {
            setSaving(false)
        }
    }

    //  Format

    //  Format
    const fmtDate = (d: string | null) => {
        if (!d) return '—'
        return new Date(d).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
        })
    }

    //  Render

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
                        Create and manage system events.
                        {currentEvent && (
                            <span className="text-primary ml-2 font-medium">
                                Active: {currentEvent.name} ({currentEvent.code})
                            </span>
                        )}
                    </p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="h-4 w-4" />
                    Create Event
                </Button>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

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
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={COLUMNS.length}
                                        className="text-muted-foreground py-16 text-center text-sm"
                                    >
                                        Loading events…
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={COLUMNS.length}
                                        className="text-muted-foreground py-16 text-center text-sm"
                                    >
                                        {search
                                            ? 'No events match your search.'
                                            : 'No events yet. Click Create Event to get started.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((event) => (
                                    <tr
                                        key={event.id}
                                        className="border-b last:border-0 hover:bg-muted/40"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs font-medium">
                                            {event.code}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{event.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {fmtDate(event.period_start)}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {fmtDate(event.period_end)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={event.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {event.status !== 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => handleSetActive(event)}
                                                        title="Set as active event"
                                                        disabled={saving}
                                                    >
                                                        <Zap className="h-3.5 w-3.5 text-primary" />
                                                    </Button>
                                                )}
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
                        <Button variant="outline" onClick={() => setModal(null)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving
                                ? 'Saving…'
                                : modal?.mode === 'add'
                                  ? 'Create Event'
                                  : 'Save Changes'}
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
                        </FormRow>
                        <FormField label="Event Name" required>
                            <Input
                                placeholder="TNAP Convention 2025"
                                value={modal.data.name}
                                onChange={(e) => setField('name', e.target.value)}
                            />
                        </FormField>
                        <FormRow>
                            <FormField label="Period Start">
                                <Input
                                    type="date"
                                    value={modal.data.period_start ?? ''}
                                    onChange={(e) => setField('period_start', e.target.value)}
                                />
                            </FormField>
                            <FormField label="Period End">
                                <Input
                                    type="date"
                                    value={modal.data.period_end ?? ''}
                                    onChange={(e) => setField('period_end', e.target.value)}
                                />
                            </FormField>
                        </FormRow>
                        {error && <p className="text-sm text-destructive">{error}</p>}
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
