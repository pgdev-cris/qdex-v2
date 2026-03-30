import type { ReactNode } from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ModalProps {
    open: boolean
    onClose: () => void
    title: string
    description?: string
    children: ReactNode
    footer?: ReactNode
    size?: 'sm' | 'md' | 'lg'
}

export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
}: ModalProps) {
    if (!open) return null

    const widths = { sm: 'w-96', md: 'w-[480px]', lg: 'w-[640px]' }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Panel */}
            <div
                className={cn(
                    'relative z-10 max-h-[90vh] overflow-y-auto rounded-xl border bg-card shadow-xl',
                    widths[size]
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b px-6 py-4">
                    <div>
                        <p className="text-base font-semibold text-card-foreground">{title}</p>
                        {description && (
                            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onClose}
                        className="-mr-1 -mt-1 text-muted-foreground"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Body */}
                <div className="px-6 py-5">{children}</div>

                {/* Footer */}
                {footer && (
                    <div className="flex justify-end gap-2 border-t px-6 py-4">{footer}</div>
                )}
            </div>
        </div>
    )
}

// ─── Generic confirm variant ──────────────────────────────────────────────────

export interface ConfirmRow {
    label: string
    value: string
}

interface ConfirmModalProps {
    open: boolean
    title: string
    description?: string
    rows?: ConfirmRow[]
    confirmLabel?: string
    loading?: boolean
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmModal({
    open,
    title,
    description,
    rows,
    confirmLabel = 'Confirm',
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={!loading ? onCancel : undefined}
        >
            <div className="absolute inset-0 bg-black/50" />
            <div
                className="relative z-10 w-96 rounded-xl border bg-card shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b px-6 py-4">
                    <p className="text-base font-semibold text-card-foreground">{title}</p>
                    {description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                    )}
                </div>

                {/* Summary rows */}
                {rows && rows.length > 0 && (
                    <div className="divide-y px-6 py-1">
                        {rows.map(({ label, value }) => (
                            <div
                                key={label}
                                className="flex items-start justify-between gap-4 py-2.5 text-sm"
                            >
                                <span className="shrink-0 text-muted-foreground">{label}</span>
                                <span className="text-right font-medium">{value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-2 border-t px-6 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button size="sm" onClick={onConfirm} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing…
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ─── Delete confirmation variant ─────────────────────────────────────────────

interface DeleteModalProps {
    open: boolean
    label: string
    onConfirm: () => void
    onCancel: () => void
}

export function DeleteModal({ open, label, onConfirm, onCancel }: DeleteModalProps) {
    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div className="absolute inset-0 bg-black/50" />
            <div
                className="relative z-10 w-80 rounded-xl border bg-card p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <p className="text-sm font-semibold text-card-foreground">Delete {label}?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    This action cannot be undone.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button variant="destructive" size="sm" onClick={onConfirm}>
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ─── Shared form field helpers ────────────────────────────────────────────────

interface FieldProps {
    label: string
    required?: boolean
    children: ReactNode
    hint?: string
}

export function FormField({ label, required, children, hint }: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
                {label}
                {required && <span className="ml-0.5 text-destructive">*</span>}
            </label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    )
}

export function FormSelect({
    value,
    onChange,
    children,
    placeholder,
}: {
    value: string
    onChange: (v: string) => void
    children: ReactNode
    placeholder?: string
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full cursor-pointer rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
            {placeholder && (
                <option value="" disabled>
                    {placeholder}
                </option>
            )}
            {children}
        </select>
    )
}

export function FormRow({ children }: { children: ReactNode }) {
    return <div className="grid grid-cols-2 gap-4">{children}</div>
}
