import { CheckCircle2 } from 'lucide-react'
import type { Step } from '../types'

const STEPS: { key: Step; label: string }[] = [
    { key: 'search', label: 'Vendor' },
    { key: 'select-type', label: 'Type' },
    { key: 'remit', label: 'Remittance' },
    { key: 'receipt', label: 'Receipt' },
]

interface Props {
    step: Step
}

export function StepIndicator({ step }: Props) {
    const idx = STEPS.findIndex((s) => s.key === step)

    return (
        <ol className="mb-6 flex w-full items-center px-6">
            {STEPS.map((s, i) => {
                const done = i < idx
                const active = i === idx
                return (
                    <li key={s.key} className="flex flex-1 items-center">
                        {/* Step node */}
                        <div className="flex flex-col items-center" style={{ minWidth: 0 }}>
                            <span
                                className={[
                                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                                    done
                                        ? 'bg-primary text-primary-foreground'
                                        : active
                                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                                          : 'bg-muted text-muted-foreground',
                                ].join(' ')}
                            >
                                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                            </span>
                            <span
                                className={[
                                    'mt-1 text-xs whitespace-nowrap',
                                    active
                                        ? 'font-medium text-primary'
                                        : done
                                          ? 'text-muted-foreground'
                                          : 'text-muted-foreground/50',
                                ].join(' ')}
                            >
                                {s.label}
                            </span>
                        </div>

                        {/* Connector line — only between steps */}
                        {i < STEPS.length - 1 && (
                            <div
                                className={[
                                    'mb-4 mx-1 h-px flex-1',
                                    done ? 'bg-primary' : 'bg-border',
                                ].join(' ')}
                            />
                        )}
                    </li>
                )
            })}
        </ol>
    )
}
