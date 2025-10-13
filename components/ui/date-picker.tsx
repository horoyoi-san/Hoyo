"use client"

import * as React from "react"
import { addDays } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "เลือกวันที่",
  disabled = false,
  className,
}: DatePickerProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDate(date) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col space-y-2 p-3">
        <Select
          onValueChange={(value) => {
            if (value === "clear") {
              onDateChange?.(undefined)
            } else {
              onDateChange?.(addDays(new Date(), parseInt(value)))
            }
          }}
        >
          <SelectTrigger className="w-full h-9 text-sm">
            <SelectValue placeholder="การเลือกอย่างรวดเร็ว" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="1">หมดอายุใน 1 วัน</SelectItem>
            <SelectItem value="3">หมดอายุใน 3 วัน</SelectItem>
            <SelectItem value="7">หมดอายุใน 7 วัน</SelectItem>
            <SelectItem value="30">หมดอายุใน 30 วัน</SelectItem>
            <SelectItem value="clear">มีผลถาวร</SelectItem>
          </SelectContent>
        </Select>
        <div className="rounded-md border w-full">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateChange}
            disabled={(date) => date < new Date()}
            className="p-0"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
