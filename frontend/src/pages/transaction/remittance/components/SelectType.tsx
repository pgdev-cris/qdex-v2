import {
    RotateCcw,
    ChevronRight,
    BadgeDollarSign,
    Layers,
    Loader2,
    AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { RemitType } from '../types'

interface Props {
    supplierCode: string
    supplierName: string
    remitterName: string
    loading: boolean
    selectError: string | null
    /** Which type is currently being submitted (shows spinner on that button only) */
    pendingType: RemitType | null
    onRemitterChange: (value: string) => void
    onSelectType: (type: RemitType) => void
    onBack: () => void
}

export const SelectType = ({
    supplierCode,
    supplierName,
    remitterName,
    loading,
    selectError,
    pendingType,
    onRemitterChange,
    onSelectType,
    onBack,
}: Props) => {
    const canProceed = remitterName.trim().length > 0 && !loading

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Remittance Information</CardTitle>
                        <CardDescription>
                            Supplier:{' '}
                            <span className="font-medium text-foreground">{supplierCode}</span>
                            {supplierName && (
                                <span className="ml-1 text-foreground">— {supplierName}</span>
                            )}
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        disabled={loading}
                        className="text-muted-foreground"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Change
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
                {/* Remitter name */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">
                        Remitter Name
                        <span className="ml-0.5 text-destructive">*</span>
                    </label>
                    <Input
                        placeholder="Name of person remitting..."
                        value={remitterName}
                        onChange={(e) => onRemitterChange(e.target.value)}
                        disabled={loading}
                        autoFocus
                    />
                </div>

                {/* Error banner */}
                {selectError && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {selectError}
                    </div>
                )}

                <label className="text-sm font-medium">
                    Select Remittance Type
                    <span className="ml-0.5 text-destructive">*</span>
                </label>

                {/* Partial */}
                <Button
                    variant="outline"
                    onClick={() => onSelectType('partial')}
                    disabled={!canProceed}
                    className="group h-auto w-full justify-start p-4 hover:border-primary hover:bg-primary/5"
                >
                    <div className="flex w-full items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/20">
                            <BadgeDollarSign className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-medium">Partial Remittance</p>
                            <p className="text-muted-foreground text-xs font-normal">
                                Remit a specific cash amount only
                            </p>
                        </div>
                        <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                    </div>
                </Button>

                {/* Full */}
                <Button
                    variant="outline"
                    onClick={() => onSelectType('full')}
                    disabled={!canProceed}
                    className="group h-auto w-full justify-start p-4 hover:border-primary hover:bg-primary/5"
                >
                    <div className="flex w-full items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/20">
                            {pendingType === 'full' ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Layers className="h-5 w-5" />
                            )}
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-medium">Full Remittance</p>
                            <p className="text-muted-foreground text-xs font-normal">
                                {pendingType === 'full'
                                    ? 'Processing…'
                                    : 'Remit all payment methods for this supplier'}
                            </p>
                        </div>
                        {pendingType !== 'full' && (
                            <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                        )}
                    </div>
                </Button>
            </CardContent>
        </Card>
    )
}
