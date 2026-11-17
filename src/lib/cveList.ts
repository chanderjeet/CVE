import type { CveItem } from './cveFeed'

export type DateRange = 'all' | 'day' | 'week' | 'month'
export type SortOrder = 'newest' | 'oldest' | 'title'

export interface CveFilters {
  query: string
  dateRange: DateRange
  sortOrder: SortOrder
  now?: number
}

const rangeInMs: Record<Exclude<DateRange, 'all'>, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
}

export function filterAndSortCves(items: CveItem[], filters: CveFilters): CveItem[] {
  const query = filters.query.trim().toLocaleLowerCase()
  const cutoff =
    filters.dateRange === 'all' ? null : (filters.now ?? Date.now()) - rangeInMs[filters.dateRange]

  return items
    .filter((item) => {
      const matchesQuery =
        !query ||
        `${item.id} ${item.title} ${item.description}`.toLocaleLowerCase().includes(query)
      const date = item.publishedAt ? Date.parse(item.publishedAt) : Number.NaN
      const matchesDate = cutoff === null || (Number.isFinite(date) && date >= cutoff)
      return matchesQuery && matchesDate
    })
    .sort((a, b) => {
      if (filters.sortOrder === 'title') {
        const aHasDate = Boolean(a.publishedAt)
        const bHasDate = Boolean(b.publishedAt)

        if (aHasDate !== bHasDate) return aHasDate ? -1 : 1
        return a.title.localeCompare(b.title)
      }

      if (!a.publishedAt) return b.publishedAt ? 1 : 0
      if (!b.publishedAt) return -1
      const left = Date.parse(a.publishedAt)
      const right = Date.parse(b.publishedAt)
      return filters.sortOrder === 'newest' ? right - left : left - right
    })
}
