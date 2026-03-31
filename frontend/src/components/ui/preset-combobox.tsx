import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'

export interface PresetOption {
    id: number
    name: string
}

interface Props {
    options: PresetOption[]
    value: number | null
    onChange: (value: number | null) => void
    placeholder?: string
    disabled?: boolean
}

export function PresetCombobox({
    options,
    value,
    onChange,
    placeholder = 'Select menu preset...',
    disabled = false,
}: Props) {
    const [open, setOpen] = useState(false)

    const selected = options.find((o) => o.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between font-normal"
                >
                    <span className={cn('truncate', !selected && 'text-muted-foreground')}>
                        {selected ? selected.name : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search preset..." />
                    <CommandList>
                        <CommandEmpty>No preset found.</CommandEmpty>
                        <CommandGroup>
                            {/* Clear / None option */}
                            <CommandItem
                                value="__none__"
                                onSelect={() => {
                                    onChange(null)
                                    setOpen(false)
                                }}
                            >
                                <Check
                                    className={cn(
                                        'mr-2 h-4 w-4',
                                        value === null ? 'opacity-100' : 'opacity-0',
                                    )}
                                />
                                <span className="text-muted-foreground italic">None</span>
                            </CommandItem>
                            {options.map((opt) => (
                                <CommandItem
                                    key={opt.id}
                                    value={opt.name}
                                    onSelect={() => {
                                        onChange(opt.id)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === opt.id ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    {opt.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
