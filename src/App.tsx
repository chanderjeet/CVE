import { useEffect, useMemo, useState } from 'react'
import { fetchCveFeed, type CveItem } from './lib/cveFeed'
import { filterAndSortCves, type DateRange, type SortOrder } from './lib/cveList'
import './App.css'

type FeedStatus = 'loading' | 'ready' | 'error'

const dateRangeLabels: Record<DateRange, string> = {
  all: 'Any time',
  day: 'Past 24 hours',
  week: 'Past 7 days',
  month: 'Past 30 days',
}

function formatPublishedDate(value: string | null): string {
  if (!value) return 'DATE UNKNOWN'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value))
}

function formatTimeAgo(value: string | null): string {
  if (!value) return 'Awaiting first signal'
  const delta = Date.parse(value) - Date.now()
  const minutes = Math.round(delta / 60_000)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour')
  return formatter.format(Math.round(hours / 24), 'day')
}

function App() {
  const [items, setItems] = useState<CveItem[]>([])
  const [status, setStatus] = useState<FeedStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadFeed() {
      setStatus('loading')
      setErrorMessage('')
      try {
        const feedItems = await fetchCveFeed(controller.signal)
        setItems(feedItems)
        setStatus('ready')
      } catch (error) {
        if (controller.signal.aborted) return
        setErrorMessage(
          error instanceof Error ? error.message : 'Something went wrong while loading the feed.',
        )
        setStatus('error')
      }
    }

    void loadFeed()
    return () => controller.abort()
  }, [refreshKey])

  const visibleItems = useMemo(
    () => filterAndSortCves(items, { query, dateRange, sortOrder }),
    [items, query, dateRange, sortOrder],
  )

  const newestItem = useMemo(
    () =>
      items.reduce<CveItem | null>((latest, item) => {
        if (!item.publishedAt) return latest
        if (!latest?.publishedAt || Date.parse(item.publishedAt) > Date.parse(latest.publishedAt)) {
          return item
        }
        return latest
      }, null),
    [items],
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="CVE Signal home">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-name">CVE<span>_</span>SIGNAL</span>
        </a>
        <div className="topbar-meta">
          <span className="edition">ARCADE EDITION <span>///</span> 01</span>
          <span className={`connection ${status === 'error' ? 'connection-error' : ''}`}>
            <span className="connection-dot" />
            {status === 'error' ? 'SIGNAL LOST' : status === 'loading' ? 'SYNCING' : 'LIVE FEED'}
          </span>
        </div>
      </header>

      <main>
        <section className="hero-panel" aria-labelledby="page-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> THREAT INTELLIGENCE TERMINAL</p>
            <h1 id="page-title">THE CVE<br /><span>ARCADE</span></h1>
            <p className="hero-description">
              Fresh vulnerability disclosures, straight from the wire.
              <span> Scan the feed. Find your signal.</span>
            </p>
            <a className="source-link" href="https://cve.now/feed" target="_blank" rel="noreferrer">
              <span className="source-pulse" />
              SOURCE: CVE.NOW / RSS
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="radar radar-outer" />
            <div className="radar radar-inner" />
            <div className="radar-sweep" />
            <span className="radar-cross cross-top" />
            <span className="radar-cross cross-bottom" />
            <span className="radar-tag tag-one">SIG_01</span>
            <span className="radar-tag tag-two">CVE / LIVE</span>
            <span className="radar-center">!</span>
            <span className="radar-blip blip-one" />
            <span className="radar-blip blip-two" />
            <span className="radar-blip blip-three" />
          </div>
          <div className="hero-stamp" aria-hidden="true">
            <span>VULNERABILITY</span>
            <strong>WATCH</strong>
            <span>EST. 2026</span>
          </div>
          <div className="hero-grid-line" />
        </section>

        <section className="stats-row" aria-label="Feed summary">
          <div className="stat-card">
            <span className="stat-label">SIGNALS IN FEED</span>
            <span className="stat-value">{status === 'loading' && items.length === 0 ? '---' : items.length.toString().padStart(3, '0')}</span>
            <span className="stat-note">CVE ENTRIES</span>
          </div>
          <div className="stat-card stat-card-latest">
            <span className="stat-label">LATEST TRANSMISSION</span>
            <span className="stat-value stat-value-small">{formatTimeAgo(newestItem?.publishedAt ?? null)}</span>
            <span className="stat-note">{newestItem?.id ?? 'WAITING FOR DATA'}</span>
          </div>
          <div className="stat-card stat-card-status">
            <span className="stat-label">SYSTEM STATUS</span>
            <span className={`status-value ${status === 'error' ? 'status-value-error' : ''}`}>
              <span className="status-bars" aria-hidden="true"><i /><i /><i /><i /></span>
              {status === 'error' ? 'OFFLINE' : status === 'loading' ? 'CONNECTING' : 'OPERATIONAL'}
            </span>
            <span className="stat-note">CVE.NOW / FEED</span>
          </div>
        </section>

        <section className="feed-section" aria-labelledby="feed-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-line" /> INCOMING TRANSMISSIONS</p>
              <h2 id="feed-title">THE FEED<span className="heading-period">.</span></h2>
            </div>
            <button
              className="refresh-button"
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={status === 'loading'}
            >
              <span aria-hidden="true" className={status === 'loading' ? 'refresh-icon is-spinning' : 'refresh-icon'}>↻</span>
              {status === 'loading' ? 'SCANNING' : 'REFRESH FEED'}
            </button>
          </div>

          <div className="feed-toolbar">
            <label className="search-field">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <span className="visually-hidden">Search CVEs</span>
              <input
                type="search"
                placeholder="Search CVE, keyword, or description..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd>/</kbd>
            </label>
            <label className="select-field">
              <span className="visually-hidden">Filter by date</span>
              <select value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)}>
                {Object.entries(dateRangeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="select-field sort-field">
              <span className="visually-hidden">Sort CVEs</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
          </div>

          <div className="results-line" aria-live="polite">
            <span>{status === 'loading' && items.length === 0 ? 'RECEIVING DATA...' : `${visibleItems.length} OF ${items.length} ENTRIES`}</span>
            <span className="results-divider" />
            <span>SORT: {sortOrder === 'title' ? 'TITLE A–Z' : sortOrder.toUpperCase()}</span>
          </div>

          {status === 'error' && (
            <div className="error-banner" role="alert">
              <span className="error-symbol" aria-hidden="true">!</span>
              <div>
                <strong>TRANSMISSION INTERRUPTED</strong>
                <p>{errorMessage}</p>
              </div>
              <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>RETRY</button>
            </div>
          )}

          {status === 'loading' && items.length === 0 ? (
            <div className="loading-state" role="status" aria-label="Loading CVE feed">
              <span className="loading-orb" />
              <p>ESTABLISHING UPLINK<span>...</span></p>
              <div className="loading-track"><span /></div>
            </div>
          ) : status === 'ready' && items.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">∅</span>
              <strong>NO SIGNALS DETECTED</strong>
              <p>The feed is reachable, but it contains no CVE entries right now.</p>
            </div>
          ) : visibleItems.length === 0 && status !== 'loading' ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">⌕</span>
              <strong>NO MATCH FOUND</strong>
              <p>Try a different search term or widen the date range.</p>
              <button type="button" onClick={() => { setQuery(''); setDateRange('all') }}>CLEAR FILTERS</button>
            </div>
          ) : (
            <div className="cve-list">
              {visibleItems.map((item, index) => (
                <article className="cve-card" key={`${item.id}-${item.publishedAt ?? index}`}>
                  <div className="card-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
                  <div className="card-body">
                    <div className="card-meta">
                      <span className="cve-id">{item.id}</span>
                      <span className="meta-divider">/</span>
                      <time dateTime={item.publishedAt ?? undefined}>{formatPublishedDate(item.publishedAt)}</time>
                    </div>
                    <h3>{item.title.replace(/^CVE-\d{4}-\d+:?\s*/i, '')}</h3>
                    <p className="card-description">{item.description || 'No description was provided in the source feed.'}</p>
                  </div>
                  <a className="card-link" href={item.link} target="_blank" rel="noreferrer" aria-label={`Read details for ${item.id}`}>
                    <span>OPEN FILE</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="footer">
          <span>© 2026 CVE_SIGNAL</span>
          <span className="footer-center"><i /> DATA PROVIDED BY CVE.NOW</span>
          <a href="https://cve.now" target="_blank" rel="noreferrer">CVE.NOW <span aria-hidden="true">↗</span></a>
        </footer>
      </main>
    </div>
  )
}

export default App
