import { XMLParser, XMLValidator } from 'fast-xml-parser'

export const FEED_URL = 'https://cve.now/feed'

export interface CveItem {
  id: string
  title: string
  link: string
  publishedAt: string | null
  description: string
  cvssScore?: number | null
}

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
})

type XmlRecord = Record<string, unknown>

function isRecord(value: unknown): value is XmlRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function normalizeItems(value: unknown): unknown[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function getCvssScore(value: string): number | null {
  const updatedScore = value.match(/\bCVSS score changed from \d+(?:\.\d+)? to (\d+(?:\.\d+)?)/i)
  const explicitScore = value.match(
    /\bCVSS(?:\s+v[23](?:\.\d)?)?\s*(?:base\s*)?(?:score\s*)?(?:[:=]\s*)?(10(?:\.0)?|[0-9](?:\.\d)?)\b/i,
  )
  const score = Number(updatedScore?.[1] ?? explicitScore?.[1])
  return Number.isFinite(score) && score >= 0 && score <= 10 ? score : null
}

function parseItem(value: unknown): CveItem | null {
  if (!isRecord(value)) return null

  const title = getText(value.title)
  const link = getText(value.link)
  const guid = getText(value.guid)
  const id = title.match(/CVE-\d{4}-\d+/i)?.[0] || guid.match(/CVE-\d{4}-\d+/i)?.[0] || ''

  if (!id || !title || !link) return null

  const published = getText(value.pubDate)
  const parsedDate = published ? new Date(published) : null
  const publishedAt =
    parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null

  return {
    id,
    title,
    link,
    publishedAt,
    description: getText(value.description),
    cvssScore: getCvssScore(`${title} ${getText(value.description)}`),
  }
}

export function parseCveFeed(xml: string): CveItem[] {
  const validation = XMLValidator.validate(xml)
  if (validation !== true) {
    throw new Error('The CVE feed returned invalid XML.')
  }

  const document: unknown = parser.parse(xml)
  if (!isRecord(document) || !isRecord(document.rss) || !isRecord(document.rss.channel)) {
    throw new Error('The CVE feed does not contain a valid RSS channel.')
  }

  return normalizeItems(document.rss.channel.item)
    .map(parseItem)
    .filter((item): item is CveItem => item !== null)
}

export async function fetchCveFeed(signal?: AbortSignal): Promise<CveItem[]> {
  const response = await fetch(FEED_URL, { signal, headers: { Accept: 'application/rss+xml, application/xml' } })
  if (!response.ok) {
    throw new Error(`The CVE feed could not be loaded (HTTP ${response.status}).`)
  }

  return parseCveFeed(await response.text())
}
