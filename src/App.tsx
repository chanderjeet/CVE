import './App.css'

const filterButtons = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const leaderboard = [
  { rank: '1ST', id: 'CVE-YYYY-NNNNN', vendor: '[Vendor / product name]', level: 'CRIT', width: '100%' },
  { rank: '2ND', id: 'CVE-YYYY-NNNNN', vendor: '[Vendor / product name]', level: 'HIGH', width: '80%' },
  { rank: '3RD', id: 'CVE-YYYY-NNNNN', vendor: '[Vendor / product name]', level: 'MED', width: '68%' },
  { rank: '4TH', id: 'CVE-YYYY-NNNNN', vendor: '[Vendor / product name]', level: 'LOW', width: '52%' },
]

const statCards = [
  { label: 'TOTAL CVES', value: '[00000]', tone: 'lime' },
  { label: 'CRITICAL TODAY', value: '[000]', tone: 'pink' },
  { label: 'LAST SYNC', value: '[00:00]', tone: 'cyan' },
]

function App() {
  return (
    <div className="screen-shell">
      <header className="top-bar" aria-label="Status bar">
        <span>1UP <strong>[SCORE]</strong></span>
        <span>HI-SCORE <strong>[TOP CVSS]</strong></span>
        <span className="live-state">LIVE <strong>· SYNCED</strong> <em>[TIME]</em></span>
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
            <input id="cve-search" type="text" value="CVE-YYYY-NNNNN" readOnly aria-label="Search CVE" />
          </div>

          <div className="filter-row" aria-label="Vulnerability severity filters">
            {filterButtons.map((label) => (
              <button key={label} type="button" className={label === 'ALL' ? 'filter-btn is-selected' : 'filter-btn'}>
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="stats-grid" aria-label="Vulnerability stats">
          {statCards.map(({ label, value, tone }) => (
            <div key={label} className={`stat-card ${tone}`}>
              <span className="stat-name">{label}</span>
              <span className="stat-value">{value}</span>
            </div>
          ))}
        </section>

        <section className="leaderboard" aria-label="Leaderboard of vulnerabilities">
          <div className="leaderboard-header">
            <span>★ HIGH SCORES ★</span>
          </div>

          <div className="leaderboard-table" role="table" aria-label="High score CVEs">
            <div className="table-head" role="row">
              <span>RANK</span>
              <span>CVE ID</span>
              <span>PRODUCT</span>
              <span>LEVEL</span>
              <span>CVSS</span>
            </div>

            {leaderboard.map(({ rank, id, vendor, level, width }) => (
              <div className="table-row" key={`${rank}-${id}`} role="row">
                <span className="rank-cell">{rank}</span>
                <span className="id-cell">{id}</span>
                <span className="product-cell">{vendor}</span>
                <span className="level-cell">
                  <span className={`pill ${level.toLowerCase()}`}>{level}</span>
                </span>
                <span className="meter-cell">
                  <span className={`meter ${level.toLowerCase()}`} style={{ width }} />
                </span>
              </div>
            ))}
          </div>
        </section>

        <button type="button" className="load-more">
          LOAD MORE <span aria-hidden="true">▾</span>
        </button>

        <div className="footer-note">DATA: [SOURCE] . CREDIT 00</div>
      </main>
    </div>
  )
}

export default App
