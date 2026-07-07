import { useMemo, useState } from "react";
import {
  catalog,
  formatBytes,
  formatDuration,
  getAllStyles,
  getLevelRange,
  getTopChart,
  seededScore,
  songs,
} from "./data";
import type { SongRecord } from "./types";

type Section = "summary" | "database" | "faq";
type SortMode = "rating" | "downloads" | "level" | "title";

const sections: Array<{ id: Section; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "database", label: "Database" },
  { id: "faq", label: "FAQ" },
];

function App() {
  const [activeSection, setActiveSection] = useState<Section>("summary");
  const [query, setQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const [selectedId, setSelectedId] = useState(songs[0]?.id ?? "");

  const styles = useMemo(() => getAllStyles(songs), []);
  const selectedSong = songs.find((song) => song.id === selectedId) ?? songs[0];

  const filteredSongs = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return songs
      .filter((song) => {
        const text = `${song.title} ${song.artist} ${song.folderName} ${song.metadata.credit}`.toLowerCase();
        const matchesQuery = !cleanQuery || text.includes(cleanQuery);
        const matchesStyle = styleFilter === "all" || song.steps.some((step) => step.style === styleFilter);
        return matchesQuery && matchesStyle;
      })
      .sort((a, b) => sortSongs(a, b, sortMode));
  }, [query, sortMode, styleFilter]);

  const stats = useMemo(() => buildStats(songs), []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-lockup" onClick={() => setActiveSection("summary")} type="button">
          <span className="brand-mark">AMX</span>
          <span>
            <strong>SMAMX Vault</strong>
            <small>{catalog.pack.name} prototype</small>
          </span>
        </button>

        <nav className="nav-tabs" aria-label="Primary">
          {sections.map((section) => (
            <button
              className={activeSection === section.id ? "active" : ""}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </nav>
      </header>

      <section className="hero-band">
        <div>
          <p className="eyebrow">StepMania AMX static catalog</p>
          <h1>Browse simfiles like a song select screen.</h1>
        </div>
        <div className="hero-console" aria-label="Pack scan status">
          <span>{stats.songCount} songs</span>
          <span>{stats.chartCount} charts</span>
          <span>{stats.totalMinutes} min audio</span>
        </div>
      </section>

      {activeSection === "summary" && <Summary stats={stats} onOpenDatabase={() => setActiveSection("database")} />}

      {activeSection === "database" && (
        <Database
          filteredSongs={filteredSongs}
          query={query}
          selectedSong={selectedSong}
          setQuery={setQuery}
          setSelectedId={setSelectedId}
          setSortMode={setSortMode}
          setStyleFilter={setStyleFilter}
          sortMode={sortMode}
          styleFilter={styleFilter}
          styles={styles}
        />
      )}

      {activeSection === "faq" && <Faq />}
    </main>
  );
}

function Summary({ stats, onOpenDatabase }: { stats: ReturnType<typeof buildStats>; onOpenDatabase: () => void }) {
  return (
    <section className="summary-grid page-section">
      <div className="stat-stage">
        <div className="pulse-ring" />
        <p>Pack telemetry</p>
        <strong>{stats.packName}</strong>
        <span>Generated from local simfile metadata and ready for GitHub Pages.</span>
      </div>

      <div className="metrics-ladder">
        {[
          ["Most downloaded", stats.mostDownloaded.title, `${stats.mostDownloaded.downloads.toLocaleString()} downloads`],
          ["Best rated", stats.bestRated.title, `${stats.bestRated.rating.toFixed(1)} player score`],
          ["Hardest chart", stats.hardest.title, `Level ${stats.hardest.level}`],
          ["Longest track", stats.longest.title, formatDuration(stats.longest.duration)],
        ].map(([label, title, value]) => (
          <article className="metric-row" key={label}>
            <span>{label}</span>
            <strong>{title}</strong>
            <em>{value}</em>
          </article>
        ))}
      </div>

      <div className="chart-stack">
        <h2>Difficulty spectrum</h2>
        <div className="level-bars">
          {stats.levelBuckets.map((bucket) => (
            <div className="level-row" key={bucket.label}>
              <span>{bucket.label}</span>
              <div>
                <i style={{ width: `${bucket.percent}%` }} />
              </div>
              <strong>{bucket.count}</strong>
            </div>
          ))}
        </div>
        <button className="primary-action" onClick={onOpenDatabase} type="button">
          Open Database
        </button>
      </div>
    </section>
  );
}

function Database({
  filteredSongs,
  query,
  selectedSong,
  setQuery,
  setSelectedId,
  setSortMode,
  setStyleFilter,
  sortMode,
  styleFilter,
  styles,
}: {
  filteredSongs: SongRecord[];
  query: string;
  selectedSong: SongRecord;
  setQuery: (value: string) => void;
  setSelectedId: (value: string) => void;
  setSortMode: (value: SortMode) => void;
  setStyleFilter: (value: string) => void;
  sortMode: SortMode;
  styleFilter: string;
  styles: string[];
}) {
  return (
    <section className="database-layout page-section">
      <aside className="filter-panel">
        <label>
          Search
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, artist, credit"
            type="search"
            value={query}
          />
        </label>

        <label>
          Step style
          <select onChange={(event) => setStyleFilter(event.target.value)} value={styleFilter}>
            <option value="all">All styles</option>
            {styles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>

        <label>
          Sort
          <select onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}>
            <option value="rating">Best rated</option>
            <option value="downloads">Most downloads</option>
            <option value="level">Highest level</option>
            <option value="title">Title</option>
          </select>
        </label>
      </aside>

      <div className="song-wheel" aria-live="polite">
        {filteredSongs.length === 0 ? (
          <div className="empty-state">
            <strong>No simfiles found</strong>
            <span>Try another search or reset the style filter.</span>
          </div>
        ) : (
          filteredSongs.map((song) => (
            <button
              className={song.id === selectedSong.id ? "song-strip selected" : "song-strip"}
              key={song.id}
              onClick={() => setSelectedId(song.id)}
              type="button"
            >
              <span className="level-chip">{getLevelRange(song)}</span>
              <span>
                <strong>{song.title}</strong>
                <small>{song.artist}</small>
              </span>
              <em>{song.bpm?.display ?? "BPM ?"}</em>
            </button>
          ))
        )}
      </div>

      <SongDetails song={selectedSong} />
    </section>
  );
}

function SongDetails({ song }: { song: SongRecord }) {
  const topChart = getTopChart(song);
  const payload = `smamx://install?pack=${encodeURIComponent(catalog.pack.name)}&song=${encodeURIComponent(song.id)}`;

  return (
    <aside className="song-detail">
      <div className="song-banner">
        <span>{song.metadata.credit || catalog.pack.name}</span>
        <strong>{song.title}</strong>
        <small>{song.artist}</small>
      </div>

      <div className="detail-grid">
        <span>
          Duration
          <strong>{formatDuration(song.audio?.durationSeconds)}</strong>
        </span>
        <span>
          Audio
          <strong>{formatBytes(song.audio?.sizeBytes)}</strong>
        </span>
        <span>
          BPM
          <strong>{song.bpm?.display ?? "Unknown"}</strong>
        </span>
        <span>
          Peak
          <strong>{topChart ? `Lv ${topChart.level}` : "Unknown"}</strong>
        </span>
      </div>

      <div className="step-list">
        {song.steps.map((step) => (
          <div className="step-item" key={`${step.sourceFile}-${step.description}-${step.levelRaw}`}>
            <span>{step.style}</span>
            <strong>{step.description || step.difficulty}</strong>
            <em>Lv {step.levelRaw || "?"}</em>
          </div>
        ))}
      </div>

      <div className="qr-panel">
        <div className="qr-mock" aria-label="Prototype QR code visual">
          {Array.from({ length: 49 }, (_, index) => (
            <i className={(index * song.id.length + index) % 5 < 2 ? "on" : ""} key={index} />
          ))}
        </div>
        <div>
          <strong>QR payload</strong>
          <code>{payload}</code>
        </div>
      </div>
    </aside>
  );
}

function Faq() {
  const items = [
    [
      "Will this work on GitHub Pages?",
      "Yes. The app is static and reads a generated JSON database, so it can be built and published as plain files.",
    ],
    [
      "Where do the SMZIP files live?",
      "The catalog can point to GitHub Releases, Pages assets, or any public file host. The current prototype focuses on metadata.",
    ],
    [
      "Is the QR code final?",
      "Not yet. The prototype shows a versioned install payload shape. We should match the exact StepMania AMX scanner format once it is finalized.",
    ],
    [
      "Can it parse more packs?",
      "Yes. The generator can be expanded to scan multiple pack folders and output one combined database.",
    ],
  ];

  return (
    <section className="faq-section page-section">
      <div className="faq-intro">
        <h2>FAQ</h2>
        <p>Decisions that matter before this becomes the public download portal.</p>
      </div>
      <div className="faq-list">
        {items.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function sortSongs(a: SongRecord, b: SongRecord, mode: SortMode): number {
  if (mode === "title") return a.title.localeCompare(b.title);
  if (mode === "level") return (getTopChart(b)?.level ?? 0) - (getTopChart(a)?.level ?? 0);
  if (mode === "downloads") return seededScore(b.id, 800, 9200) - seededScore(a.id, 800, 9200);
  return seededScore(b.id, 35, 50) - seededScore(a.id, 35, 50);
}

function buildStats(records: SongRecord[]) {
  const allCharts = records.flatMap((song) => song.steps.map((step) => ({ song, step })));
  const totalSeconds = records.reduce((sum, song) => sum + (song.audio?.durationSeconds ?? 0), 0);
  const chartCount = allCharts.length;
  const levelBuckets = [
    { label: "Lv 1-9", count: allCharts.filter(({ step }) => (step.level ?? 0) <= 9).length },
    { label: "Lv 10-17", count: allCharts.filter(({ step }) => (step.level ?? 0) >= 10 && (step.level ?? 0) <= 17).length },
    { label: "Lv 18+", count: allCharts.filter(({ step }) => (step.level ?? 0) >= 18).length },
  ].map((bucket) => ({
    ...bucket,
    percent: chartCount ? Math.max(8, Math.round((bucket.count / chartCount) * 100)) : 0,
  }));

  const hardest = allCharts.reduce(
    (winner, item) => ((item.step.level ?? 0) > winner.level ? { title: item.song.title, level: item.step.level ?? 0 } : winner),
    { title: "Unknown", level: 0 },
  );

  const longest = records.reduce(
    (winner, song) =>
      (song.audio?.durationSeconds ?? 0) > winner.duration
        ? { title: song.title, duration: song.audio?.durationSeconds ?? 0 }
        : winner,
    { title: "Unknown", duration: 0 },
  );

  const mostDownloadedSong = [...records].sort((a, b) => seededScore(b.id, 800, 9200) - seededScore(a.id, 800, 9200))[0];
  const bestRatedSong = [...records].sort((a, b) => seededScore(b.id, 35, 50) - seededScore(a.id, 35, 50))[0];

  return {
    packName: catalog.pack.name,
    songCount: records.length,
    chartCount,
    totalMinutes: Math.round(totalSeconds / 60),
    mostDownloaded: {
      title: mostDownloadedSong.title,
      downloads: seededScore(mostDownloadedSong.id, 800, 9200),
    },
    bestRated: {
      title: bestRatedSong.title,
      rating: seededScore(bestRatedSong.id, 35, 50) / 10,
    },
    hardest,
    longest,
    levelBuckets,
  };
}

export default App;
