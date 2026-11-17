import { useEffect, useMemo, useState } from 'react'
import { fetchCveFeed, type CveItem } from './lib/cveFeed'
import { filterAndSortCves } from './lib/cveList'
import './App.css'

type FeedStatus = 'loading' | 'ready' | 'error'
type Severity = 'critical' | 'high' | 'medium' | 'low'
type SeverityTone = Severity | 'unknown'
type SeverityFilter = 'all' | Severity

const severityFilters: { value: SeverityFilter; label: string; tone: SeverityTone | 'all' }[] = [
  { value: 'all', label: 'ALL FOES', tone: 'all' },
  { value: 'critical', label: 'BOSS', tone: 'critical' },
  { value: 'high', label: 'ELITE', tone: 'high' },
  { value: 'medium', label: 'COMMON', tone: 'medium' },
  { value: 'low', label: 'MINION', tone: 'low' },
]

const resultLimit = 200

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

function getRankedCves(items: CveItem[], query: string, severityFilter: SeverityFilter): CveItem[] {
  const matchingItems = filterAndSortCves(items, { query, dateRange: 'all', sortOrder: 'newest' })
  return matchingItems
    .filter((item) => severityFilter === 'all' || getSeverity(item.cvssScore) === severityFilter)
    .sort((a, b) => {
      const aScore = a.cvssScore
      const bScore = b.cvssScore
      if (aScore !== null && aScore !== undefined && bScore !== null && bScore !== undefined) {
        return bScore - aScore
      }
      if (aScore !== null && aScore !== undefined) return -1
      if (bScore !== null && bScore !== undefined) return 1
      return Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? '')
    })
}

function PixelBug({ tone }: { tone: SeverityTone }) {
  return (
    <svg className={`pixel-bug ${tone}`} viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 1h2v2h2V1h2v2h2v2h1v2h1v5h-3v-2h-2v2H6v-2H4v2H1V7h1V5h1V3h2zm-2 5v2h2V6zm8 0v2h2V6zM7 8v2h2V8z"
      />
      <path fill="currentColor" d="M2 4H0v2h2zm14 0h-2v2h2zM5 13h2v2H5zm4 0h2v2H9z" />
    </svg>
  )
}

function App() {
  const [items, setItems] = useState<CveItem[]>([])
  const [status, setStatus] = useState<FeedStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

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

  const rankedItems = useMemo(
    () => getRankedCves(items, query, severityFilter),
    [items, query, severityFilter],
  )
  const displayedItems = rankedItems.slice(0, resultLimit)
  const systemMessage =
    status === 'error'
      ? 'Connection lost. The feed could not be updated.'
      : status === 'loading'
        ? 'Scanning the live CVE feed...'
        : displayedItems[0]
          ? `A new [${displayedItems[0].id}] appeared in the feed! What will you do?`
          : 'No encounters match the current inventory filters.'

  return (
    <div className="screen-shell">
      <header className="top-bar">
        <div className="brand">
          <h1>CVE SIGNAL</h1>
          <p>QUEST LOG: LIVE VULNERABILITY FEED</p>
        </div>
        <div className="player-stats" aria-label="Feed stats">
          <span>LV <strong>[001]</strong></span>
          <span>XP <strong>[{String(items.length).padStart(5, '0')}]</strong></span>
        </div>
      </header>

      <main className="game-layout">
        <aside className="inventory" aria-label="CVE inventory controls">
          <div className="panel-frame inventory-frame">
            <h2>INVENTORY</h2>
            <label className="search-label" htmlFor="cve-search">SEARCH SCROLL</label>
            <input
              id="cve-search"
              type="search"
              placeholder="CVE-YYYY-NNNNN"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="filter-list" aria-label="Vulnerability severity filters">
              {severityFilters.map(({ value, label, tone }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={severityFilter === value}
                  className={`filter-btn ${tone} ${severityFilter === value ? 'is-selected' : ''}`}
                  onClick={() => setSeverityFilter(value)}
                >
                  <span aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="encounters" aria-label="CVE encounters">
          <div className="section-heading">
            <h2>ENCOUNTERS</h2>
          </div>

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
                <div className="encounter-list">
                  {displayedItems.map((item, index) => {
                    const severity = getSeverity(item.cvssScore)
                    const tone = severity ?? 'unknown'
                    const score = item.cvssScore
                    return (
                      <article
                        className={`encounter-card ${tone}`}
                        key={`${item.id}-${item.publishedAt ?? index}`}
                      >
                        <div className="bug-frame">
                          <PixelBug tone={tone} />
                        </div>
                        <div className="encounter-details">
                          <div className="encounter-title-row">
                            <a className="cve-id" href={item.link} target="_blank" rel="noreferrer">
                              {item.id}
                            </a>
                            <span className={`pill ${tone}`}>{severity ?? 'UNRANKED'}</span>
                          </div>
                          <p className="product-name">[{getProductName(item.title, item.id)}]</p>
                          <div className="score-row">
                            <span className="score-label">HP</span>
                            <div
                              className="score-meter"
                              role="img"
                              aria-label={
                                score === null || score === undefined
                                  ? 'CVSS score unavailable'
                                  : `CVSS ${score.toFixed(1)}`
                              }
                            >
                              {score !== null && score !== undefined && (
                                <span style={{ width: `${score * 10}%` }} />
                              )}
                            </div>
                          </div>
                        </div>
                        <a className="fight-btn" href={item.link} target="_blank" rel="noreferrer">
                          FIGHT
                        </a>
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="system-log" aria-live="polite">
        <div className="system-frame">
          <div className="system-log-header">
            <h2>SYSTEM</h2>
            <div className="system-meta">
              <span className="sync-time">LAST SYNC {formatClock(lastSynced)}</span>
              <a href="https://cve.now/feed" target="_blank" rel="noreferrer">
                CVE.NOW RSS
              </a>
            </div>
          </div>
          <p>{systemMessage}</p>
          <span className="system-cursor" aria-hidden="true">
            ▾
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
