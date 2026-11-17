import { useEffect, useMemo, useState } from 'react'
import { fetchCveFeed, type CveItem } from './lib/cveFeed'
import { filterAndSortCves } from './lib/cveList'
import './App.css'

type FeedStatus = 'loading' | 'ready' | 'error'
type Severity = 'critical' | 'high' | 'medium' | 'low'
type SeverityFilter = 'all' | Severity

const severityFilters: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'critical', label: 'CRITICAL' },
  { value: 'high', label: 'HIGH' },
  { value: 'medium', label: 'MEDIUM' },
  { value: 'low', label: 'LOW' },
]

const pageSize = 8

function getSeverity(score: number | null | undefined): Severity | null {
  if (score === null || score === undefined) return null
  if (score >= 9) return 'critical'
  if (score >= 7) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

function getProductName(title: string, id: string): string {
  const withoutId = title.replace(id, '').replace(/^:\s*/, '')
  return withoutId.replace(/\s*\(Update:.*$/i, '').trim() || 'Description unavailable'
}

function formatClock(value: Date | null): string {
  if (!value) return '--:--'
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value)
}

function App() {
  const [items, setItems] = useState<CveItem[]>([])
  const [status, setStatus] = useState<FeedStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [visibleCount, setVisibleCount] = useState(pageSize)

  useEffect(() => {
    const controller = new AbortController()

    async function loadFeed() {
      setStatus('loading')
      setErrorMessage('')
      try {
        const feedItems = await fetchCveFeed(controller.signal)
        setItems(feedItems)
        setLastSynced(new Date())
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

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [query, severityFilter])

  const matchingItems = useMemo(() => {
    const filtered = filterAndSortCves(items, { query, dateRange: 'all', sortOrder: 'newest' })
    return filtered.filter((item) => {
      if (severityFilter === 'all') return true
      return getSeverity(item.cvssScore) === severityFilter
    })
  }, [items, query, severityFilter])

  const rankedItems = useMemo(
    () =>
      [...matchingItems].sort((a, b) => {
        const aScore = a.cvssScore
        const bScore = b.cvssScore
        if (aScore !== null && aScore !== undefined && bScore !== null && bScore !== undefined) {
          return bScore - aScore
        }
        if (aScore !== null && aScore !== undefined) return -1
        if (bScore !== null && bScore !== undefined) return 1
        return Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? '')
      }),
    [matchingItems],
  )

  const highestScore = items.reduce<number | null>(
    (highest, item) =>
      item.cvssScore !== null &&
      item.cvssScore !== undefined &&
      (highest === null || item.cvssScore > highest)
        ? item.cvssScore
        : highest,
    null,
  )

  const today = new Date()
  const criticalToday = items.filter((item) => {
    if (getSeverity(item.cvssScore) !== 'critical' || !item.publishedAt) return false
    const published = new Date(item.publishedAt)
    return (
      published.getFullYear() === today.getFullYear() &&
      published.getMonth() === today.getMonth() &&
      published.getDate() === today.getDate()
    )
  }).length

  const displayedItems = rankedItems.slice(0, visibleCount)

  return (
    <div className="screen-shell">
      <header className="top-bar" aria-label="Status bar">
        <span>CVES <strong>[{items.length}]</strong></span>
        <span>HI-SCORE <strong>[{highestScore?.toFixed(1) ?? 'N/A'}]</strong></span>
        <span className={`live-state ${status === 'error' ? 'is-error' : ''}`}>
          {status === 'error' ? 'FEED ERROR' : status === 'loading' ? 'SYNCING' : 'LIVE · SYNCED'}{' '}
          <em>[{formatClock(lastSynced)}]</em>
        </span>
      </header>

      <main className="page">
        <div className="hero-block">
          <h1 className="hero-title">
            <span className="line-one">CVE</span>
            <span className="line-two">SIGNAL</span>
          </h1>
          <p className="hero-feed">LIVE VULNERABILITY FEED</p>
          <p className="hero-copy">
            Every new disclosure, ranked like a high-score table.
            <span>Search, filter and defend your stack.</span>
          </p>
        </div>

        <section className="search-panel" aria-label="Search vulnerabilities">
          <label className="search-label" htmlFor="cve-search">
            ENTER CVE ID OR KEYWORD
          </label>
          <div className="search-box">
            <input
              id="cve-search"
              type="search"
              placeholder="CVE-2026-12345 or keyword"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="filter-row" aria-label="Vulnerability severity filters">
            {severityFilters.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={severityFilter === value}
                className={`filter-btn ${severityFilter === value ? 'is-selected' : ''}`}
                onClick={() => setSeverityFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="stats-grid" aria-label="Vulnerability stats">
          <div className="stat-card lime">
            <span className="stat-name">TOTAL CVES</span>
            <span className="stat-value">{status === 'loading' && items.length === 0 ? '...' : items.length}</span>
          </div>
          <div className="stat-card pink">
            <span className="stat-name">CRITICAL TODAY</span>
            <span className="stat-value">{criticalToday}</span>
          </div>
          <div className="stat-card cyan">
            <span className="stat-name">LAST SYNC</span>
            <span className="stat-value">{formatClock(lastSynced)}</span>
          </div>
        </section>

        <section className="leaderboard" aria-label="Vulnerability feed">
          <div className="leaderboard-header">★ {severityFilter === 'all' ? 'HIGH SCORES' : severityFilter.toUpperCase()} ★</div>

          {status === 'error' && (
            <div className="feed-message error-message" role="alert">
              <strong>FEED UNAVAILABLE</strong>
              <span>{errorMessage}</span>
              <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>RETRY</button>
            </div>
          )}

          {status === 'loading' && items.length === 0 && (
            <div className="feed-message" role="status">LOADING CVE FEED...</div>
          )}

          {status === 'ready' && items.length === 0 && (
            <div className="feed-message">The feed loaded, but contains no CVE entries.</div>
          )}

          {status !== 'error' && !(status === 'loading' && items.length === 0) && (
            <>
              {rankedItems.length === 0 ? (
                <div className="feed-message">No CVEs match this search or severity filter.</div>
              ) : (
                <div className="leaderboard-table" role="table" aria-label="CVE feed results">
                  <div className="table-head" role="row">
                    <span>RANK</span>
                    <span>CVE ID</span>
                    <span>PRODUCT / DESCRIPTION</span>
                    <span>LEVEL</span>
                    <span>CVSS</span>
                  </div>
                  {displayedItems.map((item, index) => {
                    const severity = getSeverity(item.cvssScore)
                    const score = item.cvssScore
                    const tone = severity === 'critical' ? 'crit' : severity === 'medium' ? 'med' : severity
                    return (
                      <a
                        className="table-row"
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        key={`${item.id}-${item.publishedAt ?? index}`}
                        role="row"
                      >
                        <span className="rank-cell">{String(index + 1).padStart(2, '0')}</span>
                        <span className="id-cell">{item.id}</span>
                        <span className="product-cell">
                          <strong>{getProductName(item.title, item.id)}</strong>
                          <span>{item.description || 'No description provided by the source feed.'}</span>
                        </span>
                        <span className="level-cell">
                          <span className={`pill ${tone ?? 'unknown'}`}>{severity ?? 'N/A'}</span>
                        </span>
                        <span className="meter-cell" aria-label={score === null || score === undefined ? 'CVSS score unavailable' : `CVSS ${score.toFixed(1)}`}>
                          {score === null || score === undefined ? (
                            <span className="score-unavailable">N/A</span>
                          ) : (
                            <>
                              <span className={`meter ${tone ?? ''}`} style={{ width: `${score * 10}%` }} />
                              <span className="score-value">{score.toFixed(1)}</span>
                            </>
                          )}
                        </span>
                      </a>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>

        {rankedItems.length > visibleCount && (
          <button type="button" className="load-more" onClick={() => setVisibleCount((count) => count + pageSize)}>
            LOAD MORE <span aria-hidden="true">▾</span>
          </button>
        )}

        <div className="footer-note">
          DATA: <a href="https://cve.now/feed" target="_blank" rel="noreferrer">CVE.NOW RSS</a>
          {' · '}{rankedItems.length} RESULTS
          {status === 'loading' && items.length > 0 ? ' · UPDATING' : ''}
        </div>
      </main>
    </div>
  )
}

export default App
