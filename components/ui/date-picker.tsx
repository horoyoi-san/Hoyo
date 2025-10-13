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
  placeholder = "选择日期",
  disabled = false,
  className,
}: DatePickerProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-CN", {
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
            <SelectValue placeholder="快速选择" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="1">1天后过期</SelectItem>
            <SelectItem value="3">3天后过期</SelectItem>
            <SelectItem value="7">7天后过期</SelectItem>
            <SelectItem value="30">30天后过期</SelectItem>
            <SelectItem value="clear">永久有效</SelectItem>
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
