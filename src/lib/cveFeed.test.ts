import { describe, expect, it } from 'vitest'
import { parseCveFeed } from './cveFeed'

const feed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>cve.now: all CVEs</title>
    <item>
      <title>CVE-2026-120490: Example disclosure</title>
      <link>https://cve.now/CVE-2026-120490</link>
      <guid isPermaLink="false">CVE-2026-120490</guid>
      <pubDate>Thu, 12 Nov 2026 14:16:34 GMT</pubDate>
      <description>A &amp; B disclosure</description>
    </item>
    <item>
      <title>CVE-2026-120491: Entry without a date</title>
      <link>https://cve.now/CVE-2026-120491</link>
      <guid isPermaLink="false">CVE-2026-120491</guid>
      <description>Second disclosure</description>
    </item>
  </channel>
</rss>`

describe('parseCveFeed', () => {
  it('normalizes feed fields and handles one or many RSS items', () => {
    const items = parseCveFeed(feed)

    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      id: 'CVE-2026-120490',
      title: 'CVE-2026-120490: Example disclosure',
      link: 'https://cve.now/CVE-2026-120490',
      publishedAt: '2026-11-12T14:16:34.000Z',
      description: 'A & B disclosure',
    })
    expect(items[1].publishedAt).toBeNull()
  })

  it('rejects malformed XML and documents without an RSS channel', () => {
    expect(() => parseCveFeed('<rss><channel>')).toThrow('invalid XML')
    expect(() => parseCveFeed('<html />')).toThrow('valid RSS channel')
  })

  it('ignores entries that lack identifying fields', () => {
    const items = parseCveFeed(
      '<rss><channel><item><title>Incomplete</title></item></channel></rss>',
    )
    expect(items).toEqual([])
  })
})
