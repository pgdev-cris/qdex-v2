import type { RefObject } from 'react'
import { Search, ScanLine, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Props {
    inputRef: RefObject<HTMLInputElement | null>
    supplierInput: string
    loading: boolean
    error: string | null
    onChange: (value: string) => void
    onSearch: () => void
}

export const SupplierSearch = ({
    inputRef,
    supplierInput,
    loading,
    error,
    onChange,
    onSearch,
}: Props) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Find Supplier
                </CardTitle>
                <CardDescription>
                    Scan the QR code with the handheld scanner, or type the supplier code manually.
                </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
                {/* Scanner ready indicator */}
                <div
                    className="flex cursor-pointer select-none items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3"
                    onClick={() => inputRef.current?.focus()}
                    title="Click to re-focus scanner input"
                >
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                        <ScanLine className="h-4 w-4 text-green-600" />
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-30" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-green-800">Scanner Ready</p>
                        <p className="text-xs text-green-700">
                            Aim the handheld scanner at the QR code — it will fill and submit
                            automatically
                        </p>
                    </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-muted-foreground text-xs">or type manually</span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                {/* Manual input */}
                <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                    <Input
                        ref={inputRef}
                        placeholder="Supplier code..."
                        className="pl-8 uppercase"
                        value={supplierInput}
                        onChange={(e) => onChange(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                        disabled={loading}
                    />
                </div>

                {error && (
                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </p>
                )}

                <Button
                    className="w-full"
                    onClick={onSearch}
                    disabled={loading || !supplierInput.trim()}
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Searching…
                        </>
                    ) : (
                        <>
                            <Search className="h-4 w-4" />
                            Search Supplier
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
