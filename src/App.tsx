import { useMemo, useState } from "react";
import {
  formatBytes,
  formatDuration,
  getAllStyles,
  getLevelRange,
  getPackAudioSize,
  getPackChartCount,
  getPackDuration,
  getPackLevelRange,
  getPackStyles,
  getTopChart,
  getTopPackChart,
  packs,
  seededScore,
  songs,
  type PackEntry,
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
  const [selectedPackId, setSelectedPackId] = useState(packs[0]?.id ?? "");

  const styles = useMemo(() => getAllStyles(songs), []);
  const selectedPack = packs.find((pack) => pack.id === selectedPackId) ?? packs[0];

  const filteredPacks = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return packs
      .filter((pack) => {
        const songText = pack.songs.map((song) => `${song.title} ${song.artist} ${song.folderName}`).join(" ");
        const text = `${pack.name} ${songText}`.toLowerCase();
        const matchesQuery = !cleanQuery || text.includes(cleanQuery);
        const matchesStyle = styleFilter === "all" || pack.songs.some((song) => song.steps.some((step) => step.style === styleFilter));
        return matchesQuery && matchesStyle;
      })
      .sort((a, b) => sortPacks(a, b, sortMode));
  }, [query, sortMode, styleFilter]);

  const stats = useMemo(() => buildStats(songs), []);
  const visibleCounters = useMemo(
    () => (activeSection === "database" ? buildPackCounters(filteredPacks) : buildPackCounters(packs)),
    [activeSection, filteredPacks],
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-lockup" onClick={() => setActiveSection("summary")} type="button">
          <span className="brand-mark">
            <strong>v0.0.3</strong>
          </span>
          <span>
            <strong>SMAMX Vault</strong>
            <small>{packs.length} pack database</small>
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
        <div className="hero-console" aria-label="Pack scan status">
          <span>{visibleCounters.packCount} packs</span>
          <span>{visibleCounters.songCount} songs</span>
          <span>{visibleCounters.chartCount} charts</span>
        </div>
      </section>

      {activeSection === "summary" && <Summary stats={stats} onOpenDatabase={() => setActiveSection("database")} />}

      {activeSection === "database" && (
        <Database
          filteredPacks={filteredPacks}
          query={query}
          selectedPack={selectedPack}
          setQuery={setQuery}
          setSelectedPackId={setSelectedPackId}
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
      <div className="metrics-ladder">
        {[
          ["Most downloaded pack", stats.mostDownloaded.title, `${stats.mostDownloaded.downloads.toLocaleString()} downloads`],
          ["Best rated pack", stats.bestRated.title, `${stats.bestRated.rating.toFixed(1)} player score`],
          ["Hardest simfile", stats.hardest.title, `Level ${stats.hardest.level}`],
          ["Total audio", stats.totalAudio.title, formatDuration(stats.totalAudio.duration)],
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
          Open Pack Database
        </button>
      </div>
    </section>
  );
}

function Database({
  filteredPacks,
  query,
  selectedPack,
  setQuery,
  setSelectedPackId,
  setSortMode,
  setStyleFilter,
  sortMode,
  styleFilter,
  styles,
}: {
  filteredPacks: PackEntry[];
  query: string;
  selectedPack: PackEntry;
  setQuery: (value: string) => void;
  setSelectedPackId: (value: string) => void;
  setSortMode: (value: SortMode) => void;
  setStyleFilter: (value: string) => void;
  sortMode: SortMode;
  styleFilter: string;
  styles: string[];
}) {
  const [viewingPack, setViewingPack] = useState(false);

  return (
    <section className="database-layout pack-database page-section">
      <aside className="filter-panel">
        <label>
          Search packs
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pack, song, artist"
            type="search"
            value={query}
          />
        </label>

        <label>
          Contains style
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
          Sort packs
          <select onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}>
            <option value="rating">Best rated</option>
            <option value="downloads">Most downloads</option>
            <option value="level">Highest level</option>
            <option value="title">Pack name</option>
          </select>
        </label>
      </aside>

      <div className="song-wheel pack-browser" aria-live="polite">
        {viewingPack ? (
          <PackContents pack={selectedPack} onBack={() => setViewingPack(false)} />
        ) : filteredPacks.length === 0 ? (
          <div className="empty-state">
            <strong>No packs found</strong>
            <span>Try another search or reset the style filter.</span>
          </div>
        ) : (
          filteredPacks.map((pack) => (
            <button
              className={pack.id === selectedPack.id ? "song-strip pack-strip selected" : "song-strip pack-strip"}
              key={pack.id}
              onClick={() => {
                setSelectedPackId(pack.id);
                setViewingPack(true);
              }}
              type="button"
            >
              <span className="level-chip">{getPackLevelRange(pack)}</span>
              <span>
                <strong>{pack.name}</strong>
                <small>
                  {pack.songs.length} simfiles, {getPackChartCount(pack)} charts
                </small>
              </span>
              <em>{getPackStyles(pack).join(", ")}</em>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function PackContents({ pack, onBack }: { pack: PackEntry; onBack: () => void }) {
  const topChart = getTopPackChart(pack);
  const payload = `smamx://install-pack?pack=${encodeURIComponent(pack.id)}&url=${encodeURIComponent(`https://r3dthr33.github.io/sma-ziphub/packs/${pack.id}.smzip`)}`;

  return (
    <div className="pack-contents">
      <button className="back-button" onClick={onBack} type="button">
        Back to packs
      </button>

      <div className="pack-title-card">
        <div className="song-banner">
          <span>SMZIP pack</span>
          <strong>{pack.name}</strong>
          <small>{pack.songs.length} simfiles included</small>
        </div>

        <div className="title-qr">
          <div className="qr-mock" aria-label="Prototype pack QR code visual">
            {Array.from({ length: 49 }, (_, index) => (
              <i className={(index * pack.id.length + index) % 5 < 2 ? "on" : ""} key={index} />
            ))}
          </div>
          <div>
            <strong>Pack QR</strong>
            <code>{payload}</code>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <span>
          Simfiles
          <strong>{pack.songs.length}</strong>
        </span>
        <span>
          Charts
          <strong>{getPackChartCount(pack)}</strong>
        </span>
        <span>
          Audio total
          <strong>{formatDuration(getPackDuration(pack))}</strong>
        </span>
        <span>
          Audio size
          <strong>{formatBytes(getPackAudioSize(pack))}</strong>
        </span>
        <span>
          Level range
          <strong>{getPackLevelRange(pack)}</strong>
        </span>
        <span>
          Peak chart
          <strong>{topChart ? `Lv ${topChart.level}` : "Unknown"}</strong>
        </span>
      </div>

      <div className="group-strip">
        <h2>Groups included</h2>
        <div>
          {getPackGroups(pack).map((group) => (
            <span className="group-pill" key={group.name}>
              <strong>{group.name}</strong>
              <small>
                {group.songCount} simfiles, {group.chartCount} charts
              </small>
            </span>
          ))}
        </div>
      </div>

      <div className="simfile-list">
        <h2>Simfiles inside</h2>
        {pack.songs.map((song) => (
          <SimfileRow key={song.id} song={song} />
        ))}
      </div>
    </div>
  );
}

function SimfileRow({ song }: { song: SongRecord }) {
  const topChart = getTopChart(song);
  const displayTitle = getSongDisplayTitle(song);
  const displayArtist = song.metadata.artistTranslit || song.artist || getSongDisplayArtist(song);
  const chartLevels = song.steps
    .map((step) => ({
      label: step.description || step.difficulty || step.style || "Chart",
      level: step.levelRaw || "?",
      style: step.style,
    }))
    .sort((a, b) => Number(b.level) - Number(a.level));

  return (
    <article className="simfile-card">
      <header className="simfile-card-header">
        <div>
          <p>{song.groupName || "Group"}</p>
          <h3>{displayTitle}</h3>
          <span>{displayArtist || "Unknown artist"}</span>
        </div>
        <div className="simfile-card-stats">
          <span>BPM {song.bpm?.display ?? "?"}</span>
          <strong>{topChart ? `Lv ${topChart.level}` : getLevelRange(song)}</strong>
          <span>{song.steps.length} charts</span>
        </div>
      </header>

      <div className="level-chip-list" aria-label={`Chart levels for ${displayTitle}`}>
        {chartLevels.map((chart, index) => (
          <span className="chart-level-chip" key={`${song.id}-${chart.style}-${chart.label}-${chart.level}-${index}`}>
            <strong>Lv {chart.level}</strong>
            <em>{chart.label}</em>
            <small>{chart.style}</small>
          </span>
        ))}
      </div>
    </article>
  );
}

function getPackGroups(pack: PackEntry) {
  if (pack.groups?.length) return pack.groups;

  const groups = new Map<string, { name: string; songCount: number; chartCount: number }>();
  pack.songs.forEach((song) => {
    const groupName = song.groupName || pack.name;
    const group = groups.get(groupName) ?? { name: groupName, songCount: 0, chartCount: 0 };
    group.songCount += 1;
    group.chartCount += song.steps.length;
    groups.set(groupName, group);
  });

  return Array.from(groups.values());
}

function getSongDisplayTitle(song: SongRecord): string {
  if (song.metadata.titleTranslit) return song.metadata.titleTranslit;
  if (song.title) return song.title;
  const parsed = parseFolderName(song.folderName);
  return parsed.title || song.folderName;
}

function getSongDisplayArtist(song: SongRecord): string {
  const parsed = parseFolderName(song.folderName);
  return parsed.artist;
}

function parseFolderName(folderName: string) {
  const cleanName = folderName.replace(/^\[[^\]]+\]\s*/, "");
  const separator = cleanName.indexOf(" - ");
  if (separator === -1) return { artist: "", title: cleanName };
  return {
    artist: cleanName.slice(0, separator).trim(),
    title: cleanName.slice(separator + 3).trim(),
  };
}

function Faq() {
  const items = [
    [
      "What is a database entry?",
      "Each entry is an SMZIP pack or main folder. Clicking it shows the simfiles inside, but the download target stays pack-level.",
    ],
    [
      "Will this work on GitHub Pages?",
      "Yes. The app is static and reads a generated JSON database, so it can be built and published as plain files.",
    ],
    [
      "Where do the SMZIP files live?",
      "The catalog can point to GitHub Releases, Pages assets, or any public file host. The QR should point to the complete pack download.",
    ],
    [
      "Is the QR code final?",
      "Not yet. The prototype shows a pack install payload shape. We should match the exact StepMania AMX scanner format once it is finalized.",
    ],
    [
      "Can it parse more packs?",
      "Yes. The generator can be expanded to scan multiple main folders and output one entry per SMZIP pack.",
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

function sortPacks(a: PackEntry, b: PackEntry, mode: SortMode): number {
  if (mode === "title") return a.name.localeCompare(b.name);
  if (mode === "level") return (getTopPackChart(b)?.level ?? 0) - (getTopPackChart(a)?.level ?? 0);
  if (mode === "downloads") return seededScore(b.id, 800, 9200) - seededScore(a.id, 800, 9200);
  return seededScore(b.id, 35, 50) - seededScore(a.id, 35, 50);
}

function buildPackCounters(records: PackEntry[]) {
  return {
    packCount: records.length,
    songCount: records.reduce((sum, pack) => sum + pack.songs.length, 0),
    chartCount: records.reduce((sum, pack) => sum + getPackChartCount(pack), 0),
  };
}

function buildStats(records: SongRecord[]) {
  const allCharts = records.flatMap((song) => song.steps.map((step) => ({ song, step })));
  const totalSeconds = records.reduce((sum, song) => sum + (song.audio?.durationSeconds ?? 0), 0);
  const chartCount = allCharts.length;
  const topDownloadedPack = [...packs].sort((a, b) => seededScore(b.id, 800, 9200) - seededScore(a.id, 800, 9200))[0];
  const topRatedPack = [...packs].sort((a, b) => seededScore(b.id, 35, 50) - seededScore(a.id, 35, 50))[0];
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

  return {
    packName: `${packs.length} SMZIP packs`,
    songCount: records.length,
    chartCount,
    totalMinutes: Math.round(totalSeconds / 60),
    mostDownloaded: {
      title: topDownloadedPack.name,
      downloads: seededScore(topDownloadedPack.id, 800, 9200),
    },
    bestRated: {
      title: topRatedPack.name,
      rating: seededScore(topRatedPack.id, 35, 50) / 10,
    },
    hardest,
    totalAudio: {
      title: `${packs.length} packs`,
      duration: totalSeconds,
    },
    levelBuckets,
  };
}

export default App;
