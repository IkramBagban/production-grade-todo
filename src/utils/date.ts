import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  isBefore,
  isToday,
  parseISO,
} from 'date-fns'

export const toDateInputValue = (iso: string | null | undefined): string => {
  if (!iso) return ''
  try {
    return format(parseISO(iso), 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

export const formatDueDateLabel = (iso: string | null): string => {
  if (!iso) return 'No due date'
  try {
    const date = parseISO(iso)
    const calendarLabel = format(date, 'MMM d, yyyy')

    if (isToday(date)) {
      return `Due today · ${calendarLabel}`
    }

    if (isBefore(date, new Date())) {
      const relative = formatDistanceToNow(date, { addSuffix: true })
      return `Overdue · ${calendarLabel} (${relative})`
    }

    const relative = formatDistanceToNow(date, { addSuffix: true })
    return `Due ${relative} · ${calendarLabel}`
  } catch {
    return 'No due date'
  }
}

export const isDueSoon = (iso: string | null, withinDays = 3): boolean => {
  if (!iso) return false
  try {
    const date = parseISO(iso)
    const today = new Date()
    const diff = differenceInCalendarDays(date, today)

    return diff >= 0 && diff <= withinDays
  } catch {
    return false
  }
}

export const isOverdue = (iso: string | null): boolean => {
  if (!iso) return false
  try {
    const date = parseISO(iso)
    return isBefore(date, new Date()) && !isToday(date)
  } catch {
    return false
  }
}
