import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Plus, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldSet,
} from '@/components/ui/field'

// ─── Types ───────────────────────────────────────────────────────────────────

type MenuType = 'parent' | 'child'

interface Menu {
    id: number
    name: string
}

interface Preset {
    id: number
    name: string
}

interface ChildItem {
    id: string // temp local id
    name: string
    url: string
    icon: string
    sort: number
    target: string
    modal_target: string
    is_active: boolean
}

interface FormState {
    menu_type: MenuType
    name: string
    url: string
    icon: string
    parent_id: string
    sort: number
    target: string
    is_active: boolean
    preset_ids: number[]
    existing_child_ids: number[]
    children: ChildItem[]
}

interface FormErrors {
    name?: string
    sort?: string
    parent_id?: string
    children?: Record<string, { name?: string; url?: string }>
}

// ─── Mock data – replace with API fetches ────────────────────────────────────

// Used as parent options (top-level) and as existing children to pick from
const EXISTING_MENUS: Menu[] = [
    { id: 1, name: 'Dashboard' },
    { id: 2, name: 'Reports' },
    { id: 3, name: 'Settings' },
    { id: 4, name: 'Inventory' },
    { id: 5, name: 'Finance' },
    { id: 6, name: 'HR Management' },
]

// Flat child items already in the system — replace with API fetch
const EXISTING_CHILDREN: Menu[] = [
    { id: 101, name: 'Sales Report' },
    { id: 102, name: 'Purchase Orders' },
    { id: 103, name: 'Stock Overview' },
    { id: 104, name: 'Low Stock Alerts' },
    { id: 105, name: 'Employee List' },
    { id: 106, name: 'Leave Requests' },
    { id: 107, name: 'Payroll Summary' },
    { id: 108, name: 'Cash Flow' },
    { id: 109, name: 'Invoice Management' },
    { id: 110, name: 'Expense Tracker' },
    { id: 111, name: 'Audit Logs' },
    { id: 112, name: 'User Permissions' },
    { id: 113, name: 'System Settings' },
    { id: 114, name: 'Backup & Restore' },
]

const PRESETS: Preset[] = [
    { id: 1, name: 'Cashier Menu' },
    { id: 2, name: 'Admin Menu' },
    { id: 3, name: 'Manager Menu' },
    { id: 4, name: 'Supervisor Menu' },
    { id: 5, name: 'Auditor Menu' },
    { id: 6, name: 'Finance Menu' },
    { id: 7, name: 'HR Menu' },
    { id: 8, name: 'Inventory Menu' },
    { id: 9, name: 'Reports Menu' },
    { id: 10, name: 'Support Menu' },
    { id: 11, name: 'Developer Menu' },
    { id: 12, name: 'Read-only Menu' },
]

const TARGET_OPTIONS = [
    { value: '_self', label: 'Same Tab (_self)' },
    { value: '_blank', label: 'New Tab (_blank)' },
    { value: '_parent', label: 'Parent (_parent)' },
    { value: '_top', label: 'Top (_top)' },
]

const SELECT_CLASS =
    'h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

const makeChild = (): ChildItem => ({
    id: crypto.randomUUID(),
    name: '',
    url: '',
    icon: '',
    sort: 0,
    target: '_self',
    modal_target: '',
    is_active: true,
})

const INITIAL_FORM: FormState = {
    menu_type: 'parent',
    name: '',
    url: '',
    icon: '',
    parent_id: '',
    sort: 0,
    target: '_self',
    is_active: true,
    preset_ids: [],
    existing_child_ids: [],
    children: [],
}

// ─── Portal dropdown positioning hook ────────────────────────────────────────
// Calculates position from the trigger element so the dropdown can be rendered
// on document.body — escaping any overflow:hidden ancestor (e.g. Card).

interface DropdownRect {
    top: number
    left: number
    width: number
}

function useDropdownRect(
    triggerRef: React.RefObject<HTMLElement | null>,
    open: boolean
): DropdownRect | null {
    const [rect, setRect] = useState<DropdownRect | null>(null)

    const compute = () => {
        if (!triggerRef.current) return
        const r = triggerRef.current.getBoundingClientRect()
        setRect({
            top: r.bottom + window.scrollY + 4,
            left: r.left + window.scrollX,
            width: r.width,
        })
    }

    useEffect(() => {
        if (!open) return
        compute()
        window.addEventListener('scroll', compute, true)
        window.addEventListener('resize', compute)
        return () => {
            window.removeEventListener('scroll', compute, true)
            window.removeEventListener('resize', compute)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    return open ? rect : null
}

// ─── Reusable: SearchableSelect (single value) ───────────────────────────────

interface SearchableSelectProps {
    options: { value: string; label: string }[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    error?: boolean
}

function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = '— Select —',
    error,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const triggerRef = useRef<HTMLButtonElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const rect = useDropdownRect(triggerRef, open)

    const selected = options.find((o) => o.value === value)
    const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            const t = e.target as Node
            if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const handleToggle = () => {
        const next = !open
        setOpen(next)
        if (next) {
            setQuery('')
            setTimeout(() => inputRef.current?.focus(), 0)
        }
    }

    const handleSelect = (val: string) => {
        onChange(val)
        setOpen(false)
        setQuery('')
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={handleToggle}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 ${
                    error ? 'border-destructive' : 'border-input'
                }`}
            >
                <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open &&
                rect &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'absolute',
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            zIndex: 9999,
                        }}
                        className="rounded-md border border-input bg-popover shadow-md"
                    >
                        {/* Search */}
                        <div className="flex items-center gap-2 border-b border-input px-2.5 py-2">
                            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search..."
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* Options */}
                        <ul role="listbox" className="max-h-48 overflow-y-auto py-1">
                            <li>
                                <button
                                    type="button"
                                    onClick={() => handleSelect('')}
                                    className={`flex w-full items-center px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted ${!value ? 'bg-muted/50' : ''}`}
                                >
                                    {placeholder}
                                </button>
                            </li>
                            {filtered.length === 0 ? (
                                <li className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                                    No results found.
                                </li>
                            ) : (
                                filtered.map((o) => (
                                    <li key={o.value}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(o.value)}
                                            className={`flex w-full items-center justify-between px-2.5 py-1.5 text-sm hover:bg-muted ${
                                                value === o.value
                                                    ? 'text-primary'
                                                    : 'text-foreground'
                                            }`}
                                        >
                                            {o.label}
                                            {value === o.value && <Check className="h-3.5 w-3.5" />}
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>,
                    document.body
                )}
        </>
    )
}

// ─── Reusable: SearchableMultiSelect ─────────────────────────────────────────

interface SearchableMultiSelectProps {
    options: { value: number; label: string }[]
    selected: number[]
    onToggle: (id: number) => void
    placeholder?: string
}

function SearchableMultiSelect({
    options,
    selected,
    onToggle,
    placeholder = 'Search and select...',
}: SearchableMultiSelectProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const triggerRef = useRef<HTMLButtonElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const rect = useDropdownRect(triggerRef, open)

    const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    const selectedOptions = options.filter((o) => selected.includes(o.value))

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            const t = e.target as Node
            if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const handleToggle = () => {
        const next = !open
        setOpen(next)
        if (next) {
            setQuery('')
            setTimeout(() => inputRef.current?.focus(), 0)
        }
    }

    return (
        <>
            {/* Trigger — shows chips for selected items */}
            <button
                ref={triggerRef}
                type="button"
                onClick={handleToggle}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
                {selectedOptions.length === 0 ? (
                    <span className="text-muted-foreground">{placeholder}</span>
                ) : (
                    selectedOptions.map((o) => (
                        <span
                            key={o.value}
                            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-xs text-primary dark:border-primary/20 dark:bg-primary/10"
                        >
                            {o.label}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onToggle(o.value)
                                }}
                                className="text-primary/60 hover:text-primary"
                                aria-label={`Remove ${o.label}`}
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </span>
                    ))
                )}
                <ChevronDown
                    className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Portal dropdown */}
            {open &&
                rect &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'absolute',
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            zIndex: 9999,
                        }}
                        className="rounded-md border border-input bg-popover shadow-md"
                    >
                        {/* Search */}
                        <div className="flex items-center gap-2 border-b border-input px-2.5 py-2">
                            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search presets..."
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* Options list */}
                        <ul
                            role="listbox"
                            aria-multiselectable="true"
                            className="max-h-48 overflow-y-auto py-1"
                        >
                            {filtered.length === 0 ? (
                                <li className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                                    No results found.
                                </li>
                            ) : (
                                filtered.map((o) => {
                                    const isSelected = selected.includes(o.value)
                                    return (
                                        <li key={o.value}>
                                            <button
                                                type="button"
                                                onClick={() => onToggle(o.value)}
                                                aria-selected={isSelected}
                                                className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-sm hover:bg-muted"
                                            >
                                                <span
                                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                                        isSelected
                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                            : 'border-input bg-background'
                                                    }`}
                                                >
                                                    {isSelected && <Check className="h-3 w-3" />}
                                                </span>
                                                <span
                                                    className={
                                                        isSelected
                                                            ? 'text-primary'
                                                            : 'text-foreground'
                                                    }
                                                >
                                                    {o.label}
                                                </span>
                                            </button>
                                        </li>
                                    )
                                })
                            )}
                        </ul>

                        {/* Footer */}
                        {selected.length > 0 && (
                            <div className="border-t border-input px-2.5 py-1.5 text-xs text-muted-foreground">
                                {selected.length} of {options.length} selected
                            </div>
                        )}
                    </div>,
                    document.body
                )}
        </>
    )
}

// ─── Reusable: Toggle ────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="flex items-center gap-3 rounded-md border border-input px-3 py-2 text-sm transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
            <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-input'}`}
            >
                <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`}
                />
            </span>
            <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>
                {checked ? 'Active' : 'Inactive'}
            </span>
        </button>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MenuForm() {
    const [form, setForm] = useState<FormState>(INITIAL_FORM)
    const [errors, setErrors] = useState<FormErrors>({})
    const [submitted, setSubmitted] = useState<object | null>(null)

    const isParent = form.menu_type === 'parent'

    // ── Field helpers ──────────────────────────────────────────────────────────

    const set = (field: keyof FormState, value: unknown) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        set(name as keyof FormState, value)
    }

    const togglePreset = (id: number) =>
        set(
            'preset_ids',
            form.preset_ids.includes(id)
                ? form.preset_ids.filter((p) => p !== id)
                : [...form.preset_ids, id]
        )

    const toggleExistingChild = (id: number) =>
        set(
            'existing_child_ids',
            form.existing_child_ids.includes(id)
                ? form.existing_child_ids.filter((c) => c !== id)
                : [...form.existing_child_ids, id]
        )

    // ── Menu type switch ───────────────────────────────────────────────────────

    const switchType = (type: MenuType) => {
        setForm({ ...INITIAL_FORM, menu_type: type })
        setErrors({})
        setSubmitted(null)
    }

    // ── Children helpers ───────────────────────────────────────────────────────

    const addChild = () => set('children', [...form.children, makeChild()])

    const removeChild = (id: string) =>
        set(
            'children',
            form.children.filter((c) => c.id !== id)
        )

    const updateChild = (id: string, field: keyof ChildItem, value: unknown) => {
        set(
            'children',
            form.children.map((c) => (c.id === id ? { ...c, [field]: value } : c))
        )
        setErrors((prev) => ({
            ...prev,
            children: {
                ...prev.children,
                [id]: { ...prev.children?.[id], [field]: undefined },
            },
        }))
    }

    // ── Validation ─────────────────────────────────────────────────────────────

    const validate = (): FormErrors => {
        const e: FormErrors = {}

        if (!form.name.trim()) e.name = 'Name is required.'
        if (form.sort < 0) e.sort = 'Sort must be 0 or greater.'
        if (!isParent && !form.parent_id) e.parent_id = 'Please select a parent menu.'

        if (isParent && form.children.length > 0) {
            const childErrors: Record<string, { name?: string; url?: string }> = {}
            form.children.forEach((c) => {
                const ce: { name?: string; url?: string } = {}
                if (!c.name.trim()) ce.name = 'Child name is required.'
                if (!c.url.trim()) ce.url = 'URL is required for child items.'
                if (Object.keys(ce).length) childErrors[c.id] = ce
            })
            if (Object.keys(childErrors).length) e.children = childErrors
        }

        return e
    }

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) {
            setErrors(errs)
            return
        }

        const payload = isParent
            ? {
                  menu: {
                      name: form.name,
                      icon: form.icon || null,
                      sort: form.sort,
                      is_active: form.is_active ? 1 : 0,
                      parent_id: null,
                      url: null,
                  },
                  preset_ids: form.preset_ids,
                  existing_child_ids: form.existing_child_ids,
                  children: form.children.map(({ id: _id, ...c }) => ({
                      ...c,
                      url: c.url || null,
                      icon: c.icon || null,
                      modal_target: c.modal_target || null,
                      is_active: c.is_active ? 1 : 0,
                  })),
              }
            : {
                  menu: {
                      name: form.name,
                      url: form.url,
                      icon: form.icon || null,
                      parent_id: parseInt(form.parent_id),
                      sort: form.sort,
                      target: form.target,
                      is_active: form.is_active ? 1 : 0,
                  },
                  preset_ids: form.preset_ids,
              }

        console.log('[MenuForm] payload:', payload)
        setSubmitted(payload)
        // await api.post('/menus', payload)
    }

    const handleReset = () => {
        setForm(INITIAL_FORM)
        setErrors({})
        setSubmitted(null)
    }

    const parentOptions = EXISTING_MENUS.map((m) => ({ value: String(m.id), label: m.name }))
    const presetOptions = PRESETS.map((p) => ({ value: p.id, label: p.name }))
    const existingChildOptions = EXISTING_CHILDREN.map((m) => ({ value: m.id, label: m.name }))

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex min-h-screen items-start justify-center bg-muted/40 p-8">
            <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4">
                {/* ── Step 1: Menu type selector ────────────────────────────── */}
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle>Create Menu Item</CardTitle>
                        <CardDescription>
                            First, choose whether this is a top-level parent or a child item.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 gap-3">
                            {(
                                [
                                    {
                                        type: 'parent' as MenuType,
                                        label: 'Parent Menu',
                                        description:
                                            'Top-level item in the navigation drawer. No URL needed.',
                                    },
                                    {
                                        type: 'child' as MenuType,
                                        label: 'Child Menu',
                                        description:
                                            'Nested under a parent. Requires a URL and a parent.',
                                    },
                                ] as const
                            ).map(({ type, label, description }) => {
                                const active = form.menu_type === type
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => switchType(type)}
                                        className={`rounded-lg border-2 px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                                            active
                                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                : 'border-input hover:bg-muted/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                                    active
                                                        ? 'border-primary'
                                                        : 'border-muted-foreground/40'
                                                }`}
                                            >
                                                {active && (
                                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                                )}
                                            </span>
                                            <span
                                                className={`text-sm font-medium ${active ? 'text-primary' : 'text-foreground'}`}
                                            >
                                                {label}
                                            </span>
                                        </div>
                                        <p className="mt-1.5 pl-6 text-xs text-muted-foreground">
                                            {description}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* ── Step 2: Main fields ───────────────────────────────────── */}
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle>
                            {isParent ? 'Parent Menu Details' : 'Child Menu Details'}
                        </CardTitle>
                        <CardDescription>
                            {isParent
                                ? 'This item groups child items in the navigation drawer.'
                                : 'This item will be nested under the selected parent.'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                        <FieldSet>
                            <FieldGroup>
                                {/* Name */}
                                <Field data-invalid={!!errors.name}>
                                    <FieldLabel htmlFor="name">
                                        Name <span className="text-destructive">*</span>
                                    </FieldLabel>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder={
                                            isParent ? 'e.g. Reports' : 'e.g. Sales Report'
                                        }
                                        aria-invalid={!!errors.name}
                                    />
                                    {errors.name && <FieldError>{errors.name}</FieldError>}
                                </Field>

                                {/* URL — child only */}
                                {!isParent && (
                                    <Field>
                                        <FieldLabel htmlFor="url">
                                            URL <span className="text-destructive">*</span>
                                        </FieldLabel>
                                        <Input
                                            id="url"
                                            name="url"
                                            value={form.url}
                                            onChange={handleChange}
                                            placeholder="e.g. /reports/sales"
                                        />
                                    </Field>
                                )}

                                {/* Icon + Sort */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="icon">Icon</FieldLabel>
                                        <Input
                                            id="icon"
                                            name="icon"
                                            value={form.icon}
                                            onChange={handleChange}
                                            placeholder="e.g. fa-chart-bar"
                                        />
                                        <FieldDescription>
                                            Icon class or identifier
                                        </FieldDescription>
                                    </Field>

                                    <Field data-invalid={!!errors.sort}>
                                        <FieldLabel htmlFor="sort">Sort Order</FieldLabel>
                                        <Input
                                            id="sort"
                                            name="sort"
                                            type="number"
                                            min={0}
                                            value={form.sort}
                                            onChange={handleChange}
                                            aria-invalid={!!errors.sort}
                                        />
                                        {errors.sort && <FieldError>{errors.sort}</FieldError>}
                                    </Field>
                                </div>

                                {/* Parent + Target — child only */}
                                {!isParent && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field data-invalid={!!errors.parent_id}>
                                            <FieldLabel>
                                                Parent Menu{' '}
                                                <span className="text-destructive">*</span>
                                            </FieldLabel>
                                            <SearchableSelect
                                                options={parentOptions}
                                                value={form.parent_id}
                                                onChange={(v) => set('parent_id', v)}
                                                placeholder="— Select a parent —"
                                                error={!!errors.parent_id}
                                            />
                                            {errors.parent_id && (
                                                <FieldError>{errors.parent_id}</FieldError>
                                            )}
                                        </Field>

                                        <Field>
                                            <FieldLabel htmlFor="target">Link Target</FieldLabel>
                                            <select
                                                id="target"
                                                name="target"
                                                value={form.target}
                                                onChange={handleChange}
                                                className={SELECT_CLASS}
                                            >
                                                {TARGET_OPTIONS.map((t) => (
                                                    <option key={t.value} value={t.value}>
                                                        {t.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>
                                )}

                                {/* Is Active */}
                                <Field>
                                    <FieldLabel>Status</FieldLabel>
                                    <Toggle
                                        checked={form.is_active}
                                        onChange={(v) => set('is_active', v)}
                                    />
                                </Field>
                            </FieldGroup>

                            {/* Presets — searchable multi-select */}
                            <Field>
                                <FieldLabel>Assign to Presets</FieldLabel>
                                <FieldDescription>
                                    This menu item will appear in the selected preset menus.
                                </FieldDescription>
                                <div className="mt-1">
                                    <SearchableMultiSelect
                                        options={presetOptions}
                                        selected={form.preset_ids}
                                        onToggle={togglePreset}
                                        placeholder="Search and select presets..."
                                    />
                                </div>
                            </Field>
                        </FieldSet>
                    </CardContent>
                </Card>

                {/* ── Step 3: Add children inline (parent only) ─────────────── */}
                {isParent && (
                    <Card>
                        <CardHeader className="border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Children</CardTitle>
                                    <CardDescription className="mt-0.5">
                                        Optionally add child items directly under this parent.
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addChild}
                                >
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    Add Child
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-5 pt-4">
                            {/* ── Existing children picker ──────────────────── */}
                            <Field>
                                <FieldLabel>Link Existing Children</FieldLabel>
                                <FieldDescription>
                                    Select existing menu items to attach as children of this parent.
                                </FieldDescription>
                                <div className="mt-1">
                                    <SearchableMultiSelect
                                        options={existingChildOptions}
                                        selected={form.existing_child_ids}
                                        onToggle={toggleExistingChild}
                                        placeholder="Search existing menu items..."
                                    />
                                </div>
                            </Field>

                            {/* ── Inline new children ───────────────────────── */}
                            <Field>
                                <FieldLabel>Create New Children</FieldLabel>
                                <FieldDescription>
                                    Add brand-new child items that will be created alongside this
                                    parent.
                                </FieldDescription>
                            </Field>

                            {form.children.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-input py-8 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        No children yet.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={addChild}
                                        className="mt-2 text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none"
                                    >
                                        Add your first child item
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {form.children.map((child, index) => {
                                        const ce = errors.children?.[child.id]
                                        return (
                                            <div
                                                key={child.id}
                                                className="rounded-lg border border-input bg-muted/20 p-4"
                                            >
                                                {/* Child header */}
                                                <div className="mb-3 flex items-center justify-between">
                                                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Child {index + 1}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeChild(child.id)}
                                                        className="text-muted-foreground transition hover:text-destructive focus-visible:outline-none"
                                                        aria-label="Remove child"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {/* Name + URL */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Field data-invalid={!!ce?.name}>
                                                            <FieldLabel>
                                                                Name{' '}
                                                                <span className="text-destructive">
                                                                    *
                                                                </span>
                                                            </FieldLabel>
                                                            <Input
                                                                value={child.name}
                                                                onChange={(
                                                                    e: React.ChangeEvent<HTMLInputElement>
                                                                ) =>
                                                                    updateChild(
                                                                        child.id,
                                                                        'name',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="e.g. Sales Report"
                                                                aria-invalid={!!ce?.name}
                                                            />
                                                            {ce?.name && (
                                                                <FieldError>{ce.name}</FieldError>
                                                            )}
                                                        </Field>

                                                        <Field data-invalid={!!ce?.url}>
                                                            <FieldLabel>
                                                                URL{' '}
                                                                <span className="text-destructive">
                                                                    *
                                                                </span>
                                                            </FieldLabel>
                                                            <Input
                                                                value={child.url}
                                                                onChange={(
                                                                    e: React.ChangeEvent<HTMLInputElement>
                                                                ) =>
                                                                    updateChild(
                                                                        child.id,
                                                                        'url',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="e.g. /reports/sales"
                                                                aria-invalid={!!ce?.url}
                                                            />
                                                            {ce?.url && (
                                                                <FieldError>{ce.url}</FieldError>
                                                            )}
                                                        </Field>
                                                    </div>

                                                    {/* Icon + Sort */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Field>
                                                            <FieldLabel>Icon</FieldLabel>
                                                            <Input
                                                                value={child.icon}
                                                                onChange={(
                                                                    e: React.ChangeEvent<HTMLInputElement>
                                                                ) =>
                                                                    updateChild(
                                                                        child.id,
                                                                        'icon',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="fa-chart-bar"
                                                            />
                                                        </Field>

                                                        <Field>
                                                            <FieldLabel>Sort</FieldLabel>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={child.sort}
                                                                onChange={(
                                                                    e: React.ChangeEvent<HTMLInputElement>
                                                                ) =>
                                                                    updateChild(
                                                                        child.id,
                                                                        'sort',
                                                                        parseInt(e.target.value) ||
                                                                            0
                                                                    )
                                                                }
                                                            />
                                                        </Field>
                                                    </div>

                                                    {/* Link Target + Modal Target */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Field>
                                                            <FieldLabel>Link Target</FieldLabel>
                                                            <select
                                                                value={child.target}
                                                                onChange={(e) =>
                                                                    updateChild(
                                                                        child.id,
                                                                        'target',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className={SELECT_CLASS}
                                                            >
                                                                {TARGET_OPTIONS.map((t) => (
                                                                    <option
                                                                        key={t.value}
                                                                        value={t.value}
                                                                    >
                                                                        {t.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </Field>

                                                        <Field>
                                                            <FieldLabel>Modal Target</FieldLabel>
                                                            <Input
                                                                value={child.modal_target}
                                                                onChange={(
                                                                    e: React.ChangeEvent<HTMLInputElement>
                                                                ) =>
                                                                    updateChild(
                                                                        child.id,
                                                                        'modal_target',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="e.g. sales-detail-modal"
                                                            />
                                                            <FieldDescription>
                                                                ID or name of the target modal
                                                            </FieldDescription>
                                                        </Field>
                                                    </div>

                                                    {/* Active toggle */}
                                                    <Toggle
                                                        checked={child.is_active}
                                                        onChange={(v) =>
                                                            updateChild(child.id, 'is_active', v)
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {/* Add another */}
                                    <button
                                        type="button"
                                        onClick={addChild}
                                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-input py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add another child
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ── Payload preview ───────────────────────────────────────── */}
                {submitted && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                        <p className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
                            ✓ Payload ready to POST:
                        </p>
                        <pre className="overflow-auto text-xs text-green-800 dark:text-green-300">
                            {JSON.stringify(submitted, null, 2)}
                        </pre>
                    </div>
                )}

                {/* ── Actions ───────────────────────────────────────────────── */}
                <Card>
                    <CardFooter className="gap-3 pt-4">
                        <Button type="submit" className="flex-1">
                            Save Menu Item
                        </Button>
                        <Button type="button" variant="outline" onClick={handleReset}>
                            Reset
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    )
}
