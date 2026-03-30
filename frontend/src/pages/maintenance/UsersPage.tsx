import { useState } from 'react'
import { Users, Search, UserPlus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal, DeleteModal, FormField, FormRow, FormSelect } from '@/components/ui/modal'

//  Types 

interface User {
    id: number
    fname: string
    lname: string
    username: string
    dept: string
    role: string
    status: 'Active' | 'Inactive'
    created: string
}

const BLANK: Omit<User, 'id' | 'created'> = {
    fname: '',
    lname: '',
    username: '',
    dept: '',
    role: '',
    status: 'Active',
}

const ROLES = ['Admin', 'Manager', 'Staff', 'Viewer']

//  Status badge 

function StatusBadge({ status }: { status: string }) {
    const active = status === 'Active'
    return (
        <span
            className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                active
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
            ].join(' ')}
        >
            {status}
        </span>
    )
}

//  Page 

const COLUMNS = ['Name', 'Username', 'Department', 'Role', 'Status', 'Created', 'Actions']

export function UsersPage() {
    const [rows, setRows] = useState<User[]>([])
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data: Omit<User, 'id' | 'created'>; id?: number } | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
    const [nextId, setNextId] = useState(1)

    //  Helpers 

    const filtered = rows.filter((r) => {
        const q = search.toLowerCase()
        return (
            r.fname.toLowerCase().includes(q) ||
            r.lname.toLowerCase().includes(q) ||
            r.username.toLowerCase().includes(q) ||
            r.dept.toLowerCase().includes(q)
        )
    })

    function openAdd() {
        setModal({ mode: 'add', data: { ...BLANK } })
    }

    function openEdit(user: User) {
        const { id, created, ...data } = user
        setModal({ mode: 'edit', data, id })
    }

    function setField<K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) {
        setModal((m) => m ? { ...m, data: { ...m.data, [key]: value } } : m)
    }

    function handleSave() {
        if (!modal) return
        const { fname, lname, username } = modal.data
        if (!fname.trim() || !lname.trim() || !username.trim()) return

        if (modal.mode === 'add') {
            const now = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })
            setRows((r) => [...r, { id: nextId, ...modal.data, created: now }])
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

    //  Render 

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <Users className="text-muted-foreground h-5 w-5" />
                        Users
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage system users and their access.
                    </p>
                </div>
                <Button onClick={openAdd}>
                    <UserPlus className="h-4 w-4" />
                    Add User
                </Button>
            </div>

            {/* Table card */}
            <Card>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle>User List</CardTitle>
                            <CardDescription>
                                {rows.length} {rows.length === 1 ? 'user' : 'users'} registered.
                            </CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                            <Input
                                placeholder="Search users..."
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
                                        {search ? 'No users match your search.' : 'No users yet. Click Add User to get started.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((user) => (
                                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/40">
                                        <td className="px-4 py-3 font-medium">
                                            {user.fname} {user.lname}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{user.username}</td>
                                        <td className="px-4 py-3">{user.dept}</td>
                                        <td className="px-4 py-3">{user.role}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={user.status} />
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{user.created}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => openEdit(user)}
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => setDeleteTarget(user)}
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
                title={modal?.mode === 'add' ? 'Add User' : 'Edit User'}
                description="Fill in the user details below."
                footer={
                    <>
                        <Button variant="outline" onClick={() => setModal(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {modal?.mode === 'add' ? 'Add User' : 'Save Changes'}
                        </Button>
                    </>
                }
            >
                {modal && (
                    <div className="flex flex-col gap-4">
                        <FormRow>
                            <FormField label="First Name" required>
                                <Input
                                    placeholder="Juan"
                                    value={modal.data.fname}
                                    onChange={(e) => setField('fname', e.target.value)}
                                />
                            </FormField>
                            <FormField label="Last Name" required>
                                <Input
                                    placeholder="Dela Cruz"
                                    value={modal.data.lname}
                                    onChange={(e) => setField('lname', e.target.value)}
                                />
                            </FormField>
                        </FormRow>
                        <FormField label="Username" required>
                            <Input
                                placeholder="jdelacruz"
                                value={modal.data.username}
                                onChange={(e) => setField('username', e.target.value)}
                            />
                        </FormField>
                        <FormField label="Department">
                            <Input
                                placeholder="Finance"
                                value={modal.data.dept}
                                onChange={(e) => setField('dept', e.target.value)}
                            />
                        </FormField>
                        <FormRow>
                            <FormField label="Role">
                                <FormSelect
                                    value={modal.data.role}
                                    onChange={(v) => setField('role', v)}
                                    placeholder="Select role..."
                                >
                                    {ROLES.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </FormSelect>
                            </FormField>
                            <FormField label="Status">
                                <FormSelect
                                    value={modal.data.status}
                                    onChange={(v) => setField('status', v as 'Active' | 'Inactive')}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </FormSelect>
                            </FormField>
                        </FormRow>
                        {modal.mode === 'add' && (
                            <FormField label="Password" required hint="Minimum 8 characters.">
                                <Input type="password" placeholder="••••••••" />
                            </FormField>
                        )}
                    </div>
                )}
            </Modal>

            {/* Delete confirmation */}
            <DeleteModal
                open={deleteTarget !== null}
                label={deleteTarget ? `${deleteTarget.fname} ${deleteTarget.lname}` : ''}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}
