import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface DatePickerProps {
    value?: Date
    onSelect: (date: Date | undefined) => void
    placeholder?: string
}

export function DatePicker({ value, onSelect, placeholder = 'Pick a date' }: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="w-44 justify-start gap-2 px-3 font-normal"
                >
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    {value ? (
                        format(value, 'LLL dd, y')
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={(date) => {
                        onSelect(date)
                        setOpen(false)
                    }}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    )
}
