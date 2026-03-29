import { useState } from 'react'
import { Package, Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal, DeleteModal, FormField, FormRow, FormSelect } from '@/components/ui/modal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
    id: number
    code: string
    name: string
    status: 'Active' | 'Inactive'
    registered: string
}

const BLANK: Omit<Supplier, 'id' | 'registered'> = {
    code: '',
    name: '',
    status: 'Active',
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const active = status === 'Active'
    return (
        <span
            className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            ].join(' ')}
        >
            {status}
        </span>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const COLUMNS = ['Code', 'Supplier Name', 'Status', 'Registered', 'Actions']

export function SuppliersPage() {
    const [rows, setRows] = useState<Supplier[]>([])
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState<{
        mode: 'add' | 'edit'
        data: Omit<Supplier, 'id' | 'registered'>
        id?: number
    } | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
    const [nextId, setNextId] = useState(1)

    // ── Helpers ───────────────────────────────────────────────────────────────

    const filtered = rows.filter((r) => {
        const q = search.toLowerCase()
        return r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    })

    function openAdd() {
        setModal({ mode: 'add', data: { ...BLANK } })
    }

    function openEdit(supplier: Supplier) {
        const { id, registered, ...data } = supplier
        setModal({ mode: 'edit', data, id })
    }

    function setField<K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) {
        setModal((m) => (m ? { ...m, data: { ...m.data, [key]: value } } : m))
    }

    function handleSave() {
        if (!modal) return
        if (!modal.data.name.trim() || !modal.data.code.trim()) return

        if (modal.mode === 'add') {
            const now = new Date().toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
            })
            setRows((r) => [...r, { id: nextId, ...modal.data, registered: now }])
            setNextId((n) => n + 1)
        } else {
            setRows((r) => r.map((row) => (row.id === modal.id ? { ...row, ...modal.data } : row)))
        }
        setModal(null)
    }

    function handleDelete() {
        if (!deleteTarget) return
        setRows((r) => r.filter((row) => row.id !== deleteTarget.id))
        setDeleteTarget(null)
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <Package className="text-muted-foreground h-5 w-5" />
                        Suppliers
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage supplier records and information.
                    </p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="h-4 w-4" />
                    Add Supplier
                </Button>
            </div>

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
                            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
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
                                            {supplier.registered}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => openEdit(supplier)}
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => setDeleteTarget(supplier)}
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
                title={modal?.mode === 'add' ? 'Add Supplier' : 'Edit Supplier'}
                description="Fill in the supplier details below."
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setModal(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {modal?.mode === 'add' ? 'Add Supplier' : 'Save Changes'}
                        </Button>
                    </>
                }
            >
                {modal && (
                    <div className="flex flex-col gap-4">
                        <FormRow>
                            <FormField label="Supplier Code" required hint="e.g. SUP-001">
                                <Input
                                    placeholder="SUP-001"
                                    value={modal.data.code}
                                    onChange={(e) =>
                                        setField('code', e.target.value.toUpperCase())
                                    }
                                    className="uppercase"
                                />
                            </FormField>
                            <FormField label="Status">
                                <FormSelect
                                    value={modal.data.status}
                                    onChange={(v) =>
                                        setField('status', v as 'Active' | 'Inactive')
                                    }
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </FormSelect>
                            </FormField>
                        </FormRow>
                        <FormField label="Supplier Name" required>
                            <Input
                                placeholder="ACME Corporation"
                                value={modal.data.name}
                                onChange={(e) => setField('name', e.target.value)}
                            />
                        </FormField>
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
