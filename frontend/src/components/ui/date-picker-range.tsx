import * as React from 'react'
import { addDays, format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { type DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface DatePickerProps {
    label?: string
    from?: Date
    to?: Date
    onSelect: (date: DateRange) => void
}

export function DatePickerWithRange({ label, from, to, onSelect }: DatePickerProps) {
    const today = new Date()

    const [date, setDate] = React.useState<DateRange | undefined>({
        from: from ?? today,
        to: to ?? addDays(today, 7),
    })

    return (
        <Field className="mx-auto w-60">
            {label && <FieldLabel htmlFor="date-picker-range">{label}</FieldLabel>}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        id="date-picker-range"
                        className="justify-start px-2.5 font-normal"
                    >
                        <CalendarIcon />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, 'LLL dd, y')} -{' '}
                                    {format(date.to, 'LLL dd, y')}
                                </>
                            ) : (
                                format(date.from, 'LLL dd, y')
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(dateRange) => {
                            setDate(dateRange)

                            if (dateRange) {
                                onSelect(dateRange)
                            }
                        }}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </Field>
    )
}
