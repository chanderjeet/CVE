import { describe, expect, it } from 'vitest'
import { filterAndSortCves } from './cveList'
import type { CveItem } from './cveFeed'

const now = Date.parse('2026-11-12T12:00:00Z')
const entries: CveItem[] = [
  {
    id: 'CVE-2026-003',
    title: 'Zulu vulnerability',
    link: 'https://cve.now/CVE-2026-003',
    publishedAt: '2026-11-11T12:00:00.000Z',
    description: 'A remote issue',
  },
  {
    id: 'CVE-2026-002',
    title: 'Alpha vulnerability',
    link: 'https://cve.now/CVE-2026-002',
    publishedAt: '2026-11-10T12:00:00.000Z',
    description: 'A local issue',
  },
  {
    id: 'CVE-2026-001',
    title: 'Undated item',
    link: 'https://cve.now/CVE-2026-001',
    publishedAt: null,
    description: 'An older disclosure',
  },
]

describe('filterAndSortCves', () => {
  it('searches across descriptions and sorts newest first without mutating input', () => {
    const results = filterAndSortCves(entries, {
      query: 'remote',
      dateRange: 'all',
      sortOrder: 'newest',
      now,
    })

    expect(results.map((item) => item.id)).toEqual(['CVE-2026-003'])
    expect(entries[0].id).toBe('CVE-2026-003')
  })

  it('applies date ranges and keeps undated entries out of bounded ranges', () => {
    const results = filterAndSortCves(entries, {
      query: '',
      dateRange: 'day',
      sortOrder: 'newest',
      now,
    })

    expect(results.map((item) => item.id)).toEqual(['CVE-2026-003'])
  })

  it('sorts by title and places undated entries last for either date order', () => {
    expect(
      filterAndSortCves(entries, { query: '', dateRange: 'all', sortOrder: 'title' }).map(
        (item) => item.id,
      ),
    ).toEqual(['CVE-2026-002', 'CVE-2026-003', 'CVE-2026-001'])
    expect(
      filterAndSortCves(entries, { query: '', dateRange: 'all', sortOrder: 'newest' }).at(-1)?.id,
    ).toBe('CVE-2026-001')
    expect(
      filterAndSortCves(entries, { query: '', dateRange: 'all', sortOrder: 'oldest' }).at(-1)?.id,
    ).toBe('CVE-2026-001')
  })
})
