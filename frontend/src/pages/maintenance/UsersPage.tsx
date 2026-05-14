import { useState, useEffect, useCallback } from 'react'
import { Users, Search, UserPlus, Pencil, Trash2, ToggleLeft, ToggleRight, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal, DeleteModal, FormField, FormRow, FormSelect } from '@/components/ui/modal'
import { PresetCombobox, type PresetOption } from '@/components/ui/preset-combobox'
import { apiFetch } from '@/lib/api'

//  Types

interface User {
    id: number
    first_name: string
    last_name: string
    middle_name: string | null
    username: string
    department: string
    role: string
    status: number
    created_at: string
    employee_no: string | null
    menu_preset_id: number | null
    can_override: number
}

interface ApiListResponse {
    status: number
    message: string
    data: User[]
}

interface ApiSingleResponse {
    status: number
    message: string
    data: User
}

interface ApiPresetsResponse {
    status: number
    message: string
    data: PresetOption[]
}

type FormData = {
    first_name: string
    middle_name: string
    last_name: string
    username: string
    department: string
    role: string
    employee_no: string
    menu_preset_id: number | null
    can_override: number
    password?: string
}

const BLANK: FormData = {
    first_name: '',
    middle_name: '',
    last_name: '',
    username: '',
    department: '',
    role: 'Staff',
    employee_no: '',
    menu_preset_id: null,
    can_override: 0,
    password: '',
}

const ROLES = ['Admin', 'Manager', 'Staff', 'Viewer']

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

const COLUMNS = [
    'Name',
    'Username',
    'Department',
    'Role',
    'Menu Preset',
    'Can Override',
    'Status',
    'Created',
    'Actions',
]

export const UsersPage = () => {
    const [rows, setRows] = useState<User[]>([])
    const [presets, setPresets] = useState<PresetOption[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [modal, setModal] = useState<{
        mode: 'add' | 'edit'
        data: FormData
        id?: number
    } | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
    const [pwModal, setPwModal] = useState<{ user: User; oldPassword: string; newPassword: string; repeatPassword: string } | null>(null)
    const [pwError, setPwError] = useState<string | null>(null)

    //  Fetch users

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await apiFetch<ApiListResponse>('/api/v1/users')
            setRows(res.data)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load users.')
        } finally {
            setLoading(false)
        }
    }, [])

    //  Fetch presets once on mount

    const fetchPresets = useCallback(async () => {
        try {
            const res = await apiFetch<ApiPresetsResponse>('/api/v1/menu/presets')
            setPresets(res.data ?? [])
        } catch {
            // non-fatal — combobox stays empty
        }
    }, [])

    useEffect(() => {
        fetchUsers()
        fetchPresets()
    }, [fetchUsers, fetchPresets])

    //  Helpers

    const filtered = rows.filter((r) => {
        const q = search.toLowerCase()
        return (
            r.first_name.toLowerCase().includes(q) ||
            r.last_name.toLowerCase().includes(q) ||
            r.username.toLowerCase().includes(q) ||
            r.department.toLowerCase().includes(q)
        )
    })

    const presetName = (id: number | null) => {
        if (!id) return <span className="text-muted-foreground/50">—</span>
        return presets.find((p) => p.id === id)?.name ?? `#${id}`
    }

    const openAdd = () => {
        setError(null)
        setModal({ mode: 'add', data: { ...BLANK } })
    }

    const openEdit = (user: User) => {
        setError(null)
        setModal({
            mode: 'edit',
            id: user.id,
            data: {
                first_name: user.first_name,
                middle_name: user.middle_name ?? '',
                last_name: user.last_name,
                username: user.username,
                department: user.department,
                role: user.role,
                employee_no: user.employee_no ?? '',
                menu_preset_id: user.menu_preset_id,
                can_override: user.can_override ? 1 : 0,
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
        const {
            first_name,
            last_name,
            username,
            department,
            role,
            password,
            middle_name,
            employee_no,
            menu_preset_id,
            can_override,
        } = modal.data
        if (!first_name.trim() || !last_name.trim() || !username.trim() || !employee_no.trim())
            return

        setSaving(true)
        setError(null)
        try {
            const payload: Record<string, unknown> = {
                first_name: first_name.trim(),
                middle_name: middle_name.trim() || undefined,
                last_name: last_name.trim(),
                username: username.trim(),
                department: department.trim(),
                role,
                employee_no: employee_no.trim(),
                menu_preset_id: menu_preset_id ?? null,
                can_override: can_override ?? 0,
            }

            if (modal.mode === 'add') {
                payload.password = password
                await apiFetch<ApiSingleResponse>('/api/v1/users', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                })
            } else {
                await apiFetch<ApiSingleResponse>(`/api/v1/users/${modal.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                })
            }

            setModal(null)
            await fetchUsers()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to save user.')
        } finally {
            setSaving(false)
        }
    }

    //  Toggle active / inactive

    //  Toggle active / inactive
    const handleToggleStatus = async (user: User) => {
        setSaving(true)
        setError(null)
        try {
            const next = user.status === 1 ? 0 : 1
            await apiFetch(`/api/v1/users/${user.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: next }),
            })
            await fetchUsers()
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
            await apiFetch(`/api/v1/users/${deleteTarget.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 9 }),
            })
            setDeleteTarget(null)
            await fetchUsers()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to delete user.')
        } finally {
            setSaving(false)
        }
    }

    //  Change password

    const handleChangePassword = async () => {
        if (!pwModal) return
        if (pwModal.newPassword !== pwModal.repeatPassword) {
            setPwError('Passwords do not match.')
            return
        }
        setSaving(true)
        setPwError(null)
        try {
            await apiFetch(`/api/v1/users/${pwModal.user.id}/password`, {
                method: 'PATCH',
                body: JSON.stringify({ old_password: pwModal.oldPassword, new_password: pwModal.newPassword }),
            })
            setPwModal(null)
        } catch (e: unknown) {
            const err = e as { message?: string; errors?: { body?: Record<string, string> } }
            const firstBodyError = err?.errors?.body ? Object.values(err.errors.body)[0] : undefined
            setPwError(firstBodyError ?? err?.message ?? 'Failed to change password.')
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
                        <Users className="h-5 w-5 text-muted-foreground" />
                        Users
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage system users and their access.
                    </p>
                </div>
                <Button onClick={openAdd}>
                    <UserPlus className="h-4 w-4" />
                    Add User
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
                            <CardTitle>User List</CardTitle>
                            <CardDescription>
                                {rows.length} {rows.length === 1 ? 'user' : 'users'} registered.
                            </CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                                        className={`px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground ${col === 'Actions' ? 'text-center' : 'text-left'}`}
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
                                        Loading users…
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={COLUMNS.length}
                                        className="py-16 text-center text-sm text-muted-foreground"
                                    >
                                        {search
                                            ? 'No users match your search.'
                                            : 'No users yet. Click Add User to get started.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="border-b last:border-0 hover:bg-muted/40"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {user.first_name} {user.last_name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {user.username}
                                        </td>
                                        <td className="px-4 py-3">{user.department}</td>
                                        <td className="px-4 py-3">{user.role}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {presetName(user.menu_preset_id)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {!!user.can_override ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                    Yes
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                    No
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={user.status} />
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {fmtDate(user.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title={
                                                        user.status === 1
                                                            ? 'Deactivate'
                                                            : 'Activate'
                                                    }
                                                    disabled={saving}
                                                    onClick={() => handleToggleStatus(user)}
                                                >
                                                    {user.status === 1 ? (
                                                        <ToggleRight className="h-3.5 w-3.5 text-primary" />
                                                    ) : (
                                                        <ToggleLeft className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
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
                                                    onClick={() => { setPwError(null); setPwModal({ user, oldPassword: '', newPassword: '', repeatPassword: '' }) }}
                                                    title="Change Password"
                                                >
                                                    <KeyRound className="h-3.5 w-3.5" />
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
                        <Button variant="outline" onClick={() => setModal(null)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving
                                ? 'Saving…'
                                : modal?.mode === 'add'
                                  ? 'Add User'
                                  : 'Save Changes'}
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
                                    value={modal.data.first_name}
                                    onChange={(e) => setField('first_name', e.target.value)}
                                />
                            </FormField>
                            <FormField label="Last Name" required>
                                <Input
                                    placeholder="Dela Cruz"
                                    value={modal.data.last_name}
                                    onChange={(e) => setField('last_name', e.target.value)}
                                />
                            </FormField>
                        </FormRow>
                        <FormRow>
                            <FormField label="Middle Name">
                                <Input
                                    placeholder="Santos"
                                    value={modal.data.middle_name}
                                    onChange={(e) => setField('middle_name', e.target.value)}
                                />
                            </FormField>
                            <FormField label="Username" required>
                                <Input
                                    placeholder="jdelacruz"
                                    value={modal.data.username}
                                    onChange={(e) => setField('username', e.target.value)}
                                    disabled={modal.mode === 'edit'}
                                />
                            </FormField>
                        </FormRow>
                        <FormRow>
                            <FormField label="Department">
                                <Input
                                    placeholder="Finance"
                                    value={modal.data.department}
                                    onChange={(e) => setField('department', e.target.value)}
                                />
                            </FormField>
                            <FormField label="Employee No." required>
                                <Input
                                    placeholder="EMP-001"
                                    value={modal.data.employee_no}
                                    onChange={(e) => setField('employee_no', e.target.value)}
                                />
                            </FormField>
                        </FormRow>
                        <FormRow>
                            <FormField label="Role">
                                <FormSelect
                                    value={modal.data.role}
                                    onChange={(v) => setField('role', v)}
                                    placeholder="Select role..."
                                >
                                    {ROLES.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </FormSelect>
                            </FormField>
                            {modal.mode === 'add' ? (
                                <FormField label="Password" required hint="Min. 8 chars.">
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={modal.data.password}
                                        onChange={(e) => setField('password', e.target.value)}
                                    />
                                </FormField>
                            ) : (
                                <div className="flex-1" />
                            )}
                        </FormRow>

                        {/* Menu Preset — full-width searchable combobox */}
                        <FormField
                            label="Menu Preset"
                            hint="Controls which menu items this user sees."
                        >
                            <PresetCombobox
                                options={presets}
                                value={modal.data.menu_preset_id}
                                onChange={(v) => setField('menu_preset_id', v)}
                            />
                        </FormField>

                        {/* Can Override toggle */}
                        <div className="flex items-center justify-between rounded-md border px-4 py-3">
                            <div>
                                <p className="text-sm font-medium">Can Override</p>
                                <p className="text-xs text-muted-foreground">
                                    Allow this user to approve override requests.
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={modal.data.can_override === 1}
                                onClick={() =>
                                    setField('can_override', modal.data.can_override === 1 ? 0 : 1)
                                }
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                                    modal.data.can_override === 1
                                        ? 'bg-amber-500'
                                        : 'bg-muted-foreground/30'
                                }`}
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                        modal.data.can_override === 1
                                            ? 'translate-x-5'
                                            : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                )}
            </Modal>

            {/* Delete confirmation */}
            <DeleteModal
                open={deleteTarget !== null}
                label={deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}` : ''}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* Change password modal */}
            <Modal
                open={pwModal !== null}
                onClose={() => { setPwModal(null); setPwError(null) }}
                title="Change Password"
                description={
                    pwModal
                        ? `Set a new password for ${pwModal.user.first_name} ${pwModal.user.last_name}.`
                        : ''
                }
                footer={
                    <>
                        <Button variant="outline" onClick={() => { setPwModal(null); setPwError(null) }} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleChangePassword} disabled={saving}>
                            {saving ? 'Saving…' : 'Change Password'}
                        </Button>
                    </>
                }
            >
                {pwModal && (
                    <div className="flex flex-col gap-4">
                        <FormField label="Old Password" required>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={pwModal.oldPassword}
                                onChange={(e) =>
                                    setPwModal((m) => m ? { ...m, oldPassword: e.target.value } : m)
                                }
                            />
                        </FormField>
                        <FormField label="New Password" required hint="Min. 8 chars.">
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={pwModal.newPassword}
                                onChange={(e) =>
                                    setPwModal((m) => m ? { ...m, newPassword: e.target.value } : m)
                                }
                            />
                        </FormField>
                        <FormField label="Repeat New Password" required>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={pwModal.repeatPassword}
                                onChange={(e) =>
                                    setPwModal((m) => m ? { ...m, repeatPassword: e.target.value } : m)
                                }
                            />
                        </FormField>
                        {pwError && <p className="text-sm text-destructive">{pwError}</p>}
                    </div>
                )}
            </Modal>
        </div>
    )
}
