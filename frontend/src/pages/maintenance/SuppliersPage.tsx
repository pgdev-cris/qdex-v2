import { useState, useEffect, useCallback } from 'react'
import { Package, Search, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal, DeleteModal, FormField, FormRow } from '@/components/ui/modal'
import { apiFetch } from '@/lib/api'

//  Types

interface Supplier {
    id: number
    code: number
    name: string
    status: number
    created_at: string
}

interface ApiListResponse {
    status: number
    message: string
    data: Supplier[]
}

interface ApiSingleResponse {
    status: number
    message: string
    data: Supplier
}

type FormData = {
    code: string
    name: string
}

const BLANK: FormData = {
    code: '',
    name: '',
}

//  Status badge

const StatusBadge = ({ status }: { status: number }) => {
    if (status === 1) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Active
            </span>
        )
    }
    return (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Inactive
        </span>
    )
}

//  Page

const COLUMNS = ['Code', 'Supplier Name', 'Status', 'Registered', 'Actions']

export const SuppliersPage = () => {
    const [rows, setRows] = useState<Supplier[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [modal, setModal] = useState<{
        mode: 'add' | 'edit'
        data: FormData
        id?: number
    } | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)

    //  Fetch

    const fetchSuppliers = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await apiFetch<ApiListResponse>('/api/v1/suppliers')
            setRows(res.data)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load suppliers.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSuppliers()
    }, [fetchSuppliers])

    //  Helpers

    const filtered = rows.filter((r) => {
        const q = search.toLowerCase()
        return String(r.code).toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    })

    const openAdd = () => {
        setError(null)
        setModal({ mode: 'add', data: { ...BLANK } })
    }

    const openEdit = (supplier: Supplier) => {
        setError(null)
        setModal({
            mode: 'edit',
            id: supplier.id,
            data: {
                code: String(supplier.code),
                name: supplier.name,
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
        const { code, name } = modal.data
        if (!code.trim() || !name.trim()) return

        setSaving(true)
        setError(null)
        try {
            const payload = {
                code: parseInt(code.trim(), 10),
                name: name.trim(),
            }

            if (isNaN(payload.code)) {
                throw new Error('Code must be a number')
            }

            if (modal.mode === 'add') {
                await apiFetch<ApiSingleResponse>('/api/v1/suppliers', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                })
            } else {
                await apiFetch<ApiSingleResponse>(`/api/v1/suppliers/${modal.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                })
            }

            setModal(null)
            await fetchSuppliers()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to save supplier.')
        } finally {
            setSaving(false)
        }
    }

    //  Toggle active / inactive

    //  Toggle active / inactive
    const handleToggleStatus = async (supplier: Supplier) => {
        setSaving(true)
        setError(null)
        try {
            const next = supplier.status === 1 ? 0 : 1
            await apiFetch(`/api/v1/suppliers/${supplier.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: next }),
            })
            await fetchSuppliers()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to update status.')
        } finally {
            setSaving(false)
        }
    }

    //  Delete (soft — sets status to 9)

    //  Delete (soft — sets status to 9)
    const handleDelete = async () => {
        if (!deleteTarget) return
        setSaving(true)
        setError(null)
        try {
            await apiFetch(`/api/v1/suppliers/${deleteTarget.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 9 }),
            })
            setDeleteTarget(null)
            await fetchSuppliers()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to delete supplier.')
        } finally {
            setSaving(false)
        }
    }

    //  Format

    //  Format
    const fmtDate = (d: string) => {
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
                        <Package className="h-5 w-5 text-muted-foreground" />
                        Suppliers
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage supplier records and information.
                    </p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="h-4 w-4" />
                    Add Supplier
                </Button>
            </div>

            {/* Error banner */}
            {error && !modal && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* Table card */}
            <Card>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle>Supplier List</CardTitle>
                            <CardDescription>
                                {rows.length} {rows.length === 1 ? 'supplier' : 'suppliers'}{' '}
                                registered.
                            </CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search suppliers..."
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
                                        className="px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground"
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
                                        className="py-16 text-center text-sm text-muted-foreground"
                                    >
                                        Loading suppliers…
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={COLUMNS.length}
                                        className="py-16 text-center text-sm text-muted-foreground"
                                    >
                                        {search
                                            ? 'No suppliers match your search.'
                                            : 'No suppliers yet. Click Add Supplier to get started.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((supplier) => (
                                    <tr
                                        key={supplier.id}
                                        className="border-b last:border-0 hover:bg-muted/40"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs font-medium">
                                            {supplier.code}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{supplier.name}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={supplier.status} />
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {fmtDate(supplier.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title={
                                                        supplier.status === 1
                                                            ? 'Deactivate'
                                                            : 'Activate'
                                                    }
                                                    disabled={saving}
                                                    onClick={() => handleToggleStatus(supplier)}
                                                >
                                                    {supplier.status === 1 ? (
                                                        <ToggleRight className="h-3.5 w-3.5 text-primary" />
                                                    ) : (
                                                        <ToggleLeft className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Edit"
                                                    onClick={() => openEdit(supplier)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Delete"
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    onClick={() => setDeleteTarget(supplier)}
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
                title={modal?.mode === 'add' ? 'Add Supplier' : 'Edit Supplier'}
                description="Fill in the supplier details below."
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setModal(null)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving
                                ? 'Saving…'
                                : modal?.mode === 'add'
                                  ? 'Add Supplier'
                                  : 'Save Changes'}
                        </Button>
                    </>
                }
            >
                {modal && (
                    <div className="flex flex-col gap-4">
                        <FormRow>
                            <FormField label="Supplier Code" required hint="e.g. 1001">
                                <Input
                                    type="number"
                                    placeholder="1001"
                                    value={modal.data.code}
                                    onChange={(e) => setField('code', e.target.value)}
                                />
                            </FormField>
                        </FormRow>
                        <FormField label="Supplier Name" required>
                            <Input
                                placeholder="ACME Corporation"
                                value={modal.data.name}
                                onChange={(e) => setField('name', e.target.value)}
                            />
                        </FormField>
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
