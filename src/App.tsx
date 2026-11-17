import { useEffect, useMemo, useState } from 'react'
import { fetchCveFeed, type CveItem } from './lib/cveFeed'
import { filterAndSortCves } from './lib/cveList'
import './App.css'

type FeedStatus = 'loading' | 'ready' | 'error'
type Severity = 'critical' | 'high' | 'medium' | 'low'
type SeverityFilter = 'all' | Severity

const severityFilters: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'ALL FOES' },
  { value: 'critical', label: 'BOSS' },
  { value: 'high', label: 'ELITE' },
  { value: 'medium', label: 'COMMON' },
  { value: 'low', label: 'MINION' },
]

const pageSize = 200

function getSeverity(score: number | null | undefined): Severity | null {
  if (score === null || score === undefined) return null
  if (score >= 9) return 'critical'
  if (score >= 7) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

function getProductName(title: string, id: string): string {
  const withoutId = title.replace(id, '').replace(/^:\s*/, '')
  return withoutId.replace(/\s*\(Update:.*$/i, '').trim() || 'Vendor / product name'
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

  const displayedItems = rankedItems.slice(0, Math.min(visibleCount, 4))

  const topItem = rankedItems[0]
  const currentId = topItem?.id ?? 'CVE-YYYY-NNNN'

  return (
    <div className="screen-shell">
      <header className="top-bar" aria-label="Status bar">
        <div className="brand-block">
          <h1 className="brand-title">CVE SIGNAL</h1>
        </div>

        <div className="top-bar-meta">
          <button type="button" className="meta-pill is-live">
            LV <span>[00]</span>
          </button>
          <button type="button" className="meta-pill">
            XP <span>[0000]</span>
          </button>
        </div>
      </header>

      <main className="page-layout">
        <aside className="inventory-panel">
          <h2>INVENTORY</h2>

          <label className="panel-label" htmlFor="cve-search">
            SEARCH SCROLL
          </label>
          <div className="search-box">
            <input
              id="cve-search"
              type="search"
              placeholder="CVE-YYYY-NNNN"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="filter-stack" aria-label="Vulnerability severity filters">
            {severityFilters.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={severityFilter === value}
                className={`filter-btn ${severityFilter === value ? 'is-selected' : ''} ${value === 'all' ? 'all' : value}`}
                onClick={() => setSeverityFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        <section className="encounters-panel" aria-label="Vulnerability feed">
          <h2>ENCOUNTERS</h2>

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
            <div className="encounter-list">
              {displayedItems.length === 0 ? (
                <div className="feed-message">No CVEs match this search or severity filter.</div>
              ) : (
                displayedItems.map((item, index) => {
                  const severity = getSeverity(item.cvssScore)
                  const score = item.cvssScore ?? 0
                  const tone = severity === 'critical' ? 'boss' : severity === 'high' ? 'elite' : severity === 'medium' ? 'common' : 'minion'
                  const hpWidth = Math.max(12, Math.min(100, score * 10))
                  const label = severity === 'critical' ? 'BOSS' : severity === 'high' ? 'ELITE' : severity === 'medium' ? 'COMMON' : 'MINION'
                  const iconStyle = severity === 'critical' ? 'boss' : severity === 'high' ? 'elite' : severity === 'medium' ? 'common' : 'minion'

                  return (
                    <article className={`encounter-card ${tone}`} key={`${item.id}-${item.publishedAt ?? index}`}>
                      <div className={`enemy-sprite ${iconStyle}`} aria-hidden="true">
                        <span className="sprite-face" />
                      </div>

                      <div className="encounter-main">
                        <div className="encounter-header">
                          <span className="enemy-id">{item.id}</span>
                          <span className={`rank-pill ${tone}`}>{label}</span>
                        </div>

                        <div className="enemy-name">[{getProductName(item.title, item.id)}]</div>

                        <div className="hp-row">
                          <span>HP</span>
                          <div className="hp-bar">
                            <span className={`hp-fill ${tone}`} style={{ width: `${hpWidth}%` }} />
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          )}
        </section>
      </main>

      <div className="system-panel" role="status">
        <span className="system-label">SYSTEM</span>
        <div className="system-message">
          A new <strong>[{currentId}]</strong> appeared in the feed! What will you do?
        </div>
        <span className="cursor" aria-hidden="true">▾</span>
      </div>
    </div>
  )
}

export default App
