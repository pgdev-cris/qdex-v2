import { useState } from 'react'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface OverrideModalProps {
    open: boolean
    onClose: () => void
    onApproved: (approverId: number, remarks: string) => void
    /** Custom warning message shown in the amber info box. Defaults to the generic override text. */
    message?: string
}

interface OverrideResponse {
    result: 'success' | 'error'
    message: string
    data?: { approver_id: number }
}

export const OverrideModal = ({ open, onClose, onApproved, message }: OverrideModalProps) => {
    const { token } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [remarks, setRemarks] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const reset = () => {
        setUsername('')
        setPassword('')
        setRemarks('')
        setError(null)
    }

    const handleClose = () => {
        reset()
        onClose()
    }

    const handleApprove = async () => {
        if (!username.trim() || !password || !remarks.trim()) {
            setError('All fields are required.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const res = await apiFetch<OverrideResponse>('/api/v1/auth/override', {
                method: 'POST',
                body: JSON.stringify({ username: username.trim(), password }),
                token: token ?? undefined,
            })
            if (res.result !== 'success' || !res.data) {
                setError(res.message ?? 'Override failed.')
                return
            }
            const approverId = res.data.approver_id
            const capturedRemarks = remarks.trim()
            reset()
            onApproved(approverId, capturedRemarks)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Override verification failed.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Override Required"
            description="An authorized approver must verify this action."
            size="sm"
            footer={
                <>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleApprove} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Verifying…
                            </>
                        ) : (
                            'Approve Override'
                        )}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-sm text-amber-800">
                        {message ??
                            'This transaction contains overridden values. Have an authorized approver enter their credentials to proceed.'}
                    </p>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">
                        Approver Username <span className="text-destructive">*</span>
                    </label>
                    <Input
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        autoComplete="off"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">
                        Password <span className="text-destructive">*</span>
                    </label>
                    <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        autoComplete="new-password"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">
                        Remarks <span className="text-destructive">*</span>
                    </label>
                    <Input
                        placeholder="Reason for override…"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        disabled={loading}
                    />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
        </Modal>
    )
}
