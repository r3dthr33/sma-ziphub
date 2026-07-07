import { useEffect, useMemo, useState } from "react";
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
  const [styleFilters, setStyleFilters] = useState<string[]>(() => getAllStyles(songs));
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const [selectedPackId, setSelectedPackId] = useState(packs[0]?.id ?? "");
  const [viewingPack, setViewingPack] = useState(false);

  const styles = useMemo(() => getAllStyles(songs), []);
  const selectedPack = packs.find((pack) => pack.id === selectedPackId) ?? packs[0];

  const filteredPacks = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return packs
      .filter((pack) => {
        const songText = pack.songs.map((song) => `${song.title} ${song.artist} ${song.folderName}`).join(" ");
        const text = `${pack.name} ${songText}`.toLowerCase();
        const matchesQuery = !cleanQuery || text.includes(cleanQuery);
        const matchesStyle =
          styleFilters.length > 0 &&
          pack.songs.some((song) => song.steps.some((step) => styleFilters.includes(step.style)));
        return matchesQuery && matchesStyle;
      })
      .sort((a, b) => sortPacks(a, b, sortMode));
  }, [query, sortMode, styleFilters]);

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
            <strong>v0.0.25</strong>
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

      {activeSection === "summary" && (
        <Summary
          stats={stats}
          onOpenPack={(packId) => {
            setSelectedPackId(packId);
            setViewingPack(true);
            setActiveSection("database");
          }}
        />
      )}

      {activeSection === "database" && (
        <Database
          filteredPacks={filteredPacks}
          query={query}
          selectedPack={selectedPack}
          setQuery={setQuery}
          setSelectedPackId={setSelectedPackId}
          setViewingPack={setViewingPack}
          setSortMode={setSortMode}
          sortMode={sortMode}
          styleFilters={styleFilters}
          styles={styles}
          toggleAllStyleFilters={() => setStyleFilters((current) => (current.length === styles.length ? [] : styles))}
          toggleStyleFilter={(style) =>
            setStyleFilters((current) => (current.includes(style) ? current.filter((item) => item !== style) : [...current, style]))
          }
          viewingPack={viewingPack}
        />
      )}

      {activeSection === "faq" && <Faq />}
    </main>
  );
}

function Summary({
  stats,
  onOpenPack,
}: {
  stats: ReturnType<typeof buildStats>;
  onOpenPack: (packId: string) => void;
}) {
  const highlights = [
    {
      label: "Most downloaded pack",
      pack: stats.mostDownloaded.pack,
      value: `${stats.mostDownloaded.downloads.toLocaleString()} downloads`,
    },
    {
      label: "Best rated pack",
      pack: stats.bestRated.pack,
      value: `${stats.bestRated.rating.toFixed(1)} player score`,
    },
    {
      label: "Hardest chart pack",
      pack: stats.hardest.pack,
      value: `Level ${stats.hardest.level}`,
    },
    {
      label: "Longest audio pack",
      pack: stats.longestAudio.pack,
      value: formatDuration(stats.longestAudio.duration),
    },
  ];

  return (
    <section className="summary-grid page-section">
      <div className="metrics-ladder">
        {highlights.map((highlight) => (
          <button className="metric-row" key={highlight.label} onClick={() => onOpenPack(highlight.pack.id)} type="button">
            <span>{highlight.label}</span>
            <strong>{highlight.pack.name}</strong>
            <em>{highlight.value}</em>
          </button>
        ))}
      </div>

      <div className="chart-stack">
        <div className="spectrum-block">
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
        </div>

        <div className="spectrum-block">
          <h2>Style spectrum</h2>
          <div className="level-bars">
            {stats.styleBuckets.map((bucket) => (
              <div className="level-row style-row" key={bucket.label}>
                <span>{bucket.label}</span>
                <div>
                  <i style={{ width: `${bucket.percent}%` }} />
                </div>
                <strong>{bucket.count}</strong>
              </div>
            ))}
          </div>
        </div>

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
  setViewingPack,
  setSortMode,
  sortMode,
  styleFilters,
  styles,
  toggleAllStyleFilters,
  toggleStyleFilter,
  viewingPack,
}: {
  filteredPacks: PackEntry[];
  query: string;
  selectedPack: PackEntry;
  setQuery: (value: string) => void;
  setSelectedPackId: (value: string) => void;
  setViewingPack: (value: boolean) => void;
  setSortMode: (value: SortMode) => void;
  sortMode: SortMode;
  styleFilters: string[];
  styles: string[];
  toggleAllStyleFilters: () => void;
  toggleStyleFilter: (style: string) => void;
  viewingPack: boolean;
}) {
  const allStylesSelected = styleFilters.length === styles.length;

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

        <div className="filter-group">
          <span>Contains styles</span>
          <div className="style-toggle-list" role="group" aria-label="Contains styles">
            <button
              aria-pressed={allStylesSelected}
              className={allStylesSelected ? "active" : ""}
              onClick={toggleAllStyleFilters}
              type="button"
            >
              All styles
            </button>
            {styles.map((style) => (
              <button
                aria-pressed={styleFilters.includes(style)}
                className={styleFilters.includes(style) ? "active" : ""}
                key={style}
                onClick={() => toggleStyleFilter(style)}
                type="button"
              >
                {style}
              </button>
            ))}
          </div>
        </div>

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
          <PackContents key={selectedPack.id} pack={selectedPack} onBack={() => setViewingPack(false)} />
        ) : filteredPacks.length === 0 ? (
          <div className="empty-state">
            <strong>No packs found</strong>
            <span>Select at least one style or try another search.</span>
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
              <span className="pack-score">
                <span className="level-chip">{getPackLevelRange(pack)}</span>
                <small className="pack-stars" aria-label={`${(seededScore(pack.id, 35, 50) / 10).toFixed(1)} rating`}>
                  {getRatingStars(seededScore(pack.id, 35, 50) / 10)}
                </small>
                <small className="pack-downloads">{getPackDownloads(pack).toLocaleString()} downloads</small>
              </span>
              <span>
                <strong>{pack.name}</strong>
                <small>
                  {pack.songs.length} simfiles, {getPackChartCount(pack)} charts
                </small>
              </span>
              <em>{pack.author} - {getPackStyles(pack).join(", ")}</em>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function PackContents({ pack, onBack }: { pack: PackEntry; onBack: () => void }) {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const topChart = getTopPackChart(pack);
  const payload = `smamx://install-pack?pack=${encodeURIComponent(pack.id)}&url=${encodeURIComponent(`https://r3dthr33.github.io/sma-ziphub/packs/${pack.id}.smzip`)}`;
  const packGroups = getPackGroups(pack);
  const visibleSongs = selectedGroup === "all" ? pack.songs : pack.songs.filter((song) => (song.groupName || pack.name) === selectedGroup);

  return (
    <div className="pack-contents">
      <button className="back-button" onClick={onBack} type="button">
        Back to packs
      </button>

      <div className="pack-title-card">
        <div className="song-banner">
          <PackRating pack={pack} />
          <span>SMZIP pack</span>
          <strong>{pack.name}</strong>
          <small>by {pack.author}</small>
          <small>{pack.songs.length} simfiles included</small>
          <small>{getPackDownloads(pack).toLocaleString()} downloads</small>
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
          <button
            aria-pressed={selectedGroup === "all"}
            className="group-pill"
            onClick={() => setSelectedGroup("all")}
            type="button"
          >
            <strong>All groups</strong>
            <small>
              {pack.songs.length} simfiles, {getPackChartCount(pack)} charts
            </small>
          </button>
          {packGroups.map((group) => (
            <button
              aria-pressed={selectedGroup === group.name}
              className="group-pill"
              key={group.name}
              onClick={() => setSelectedGroup(group.name)}
              type="button"
            >
              <strong>{group.name}</strong>
              <small>
                {group.songCount} simfiles, {group.chartCount} charts
              </small>
            </button>
          ))}
        </div>
      </div>

      <section className="pack-simfiles">
        <h2>{selectedGroup === "all" ? "Simfiles inside" : `Simfiles in ${selectedGroup}`}</h2>
        <div className="simfile-stack">
          {visibleSongs.map((song) => (
            <SimfileRow key={song.id} song={song} />
          ))}
        </div>
      </section>
    </div>
  );
}

function getRatingStars(score: number) {
  const filled = Math.round(score);
  return Array.from({ length: 5 }, (_, index) => (index < filled ? "★" : "☆")).join("");
}

function getPackDownloads(pack: PackEntry) {
  return seededScore(pack.id, 800, 9200);
}

function PackRating({ pack }: { pack: PackEntry }) {
  const storageKey = `smamx-pack-rating:${pack.id}`;
  const catalogRating = seededScore(pack.id, 35, 50) / 10;
  const [userRating, setUserRating] = useState<number | null>(null);
  const displayRating = userRating ?? Math.round(catalogRating);

  useEffect(() => {
    const storedRating = window.localStorage.getItem(storageKey);
    setUserRating(storedRating ? Number(storedRating) : null);
  }, [storageKey]);

  function saveRating(value: number) {
    window.localStorage.setItem(storageKey, String(value));
    setUserRating(value);
  }

  return (
    <div className="pack-rating" aria-label={`Rating for ${pack.name}`}>
      <span>{userRating ? `${userRating} / 5` : `${catalogRating.toFixed(1)} score`}</span>
      <div className="rating-buttons" aria-label="Set your pack rating">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            aria-label={`${rating} star rating`}
            aria-pressed={displayRating >= rating}
            key={rating}
            onClick={() => saveRating(rating)}
            type="button"
          >
            {displayRating >= rating ? "★" : "☆"}
          </button>
        ))}
      </div>
    </div>
  );
}

function SimfileRow({ song }: { song: SongRecord }) {
  const [chartsVisible, setChartsVisible] = useState(false);
  const displayTitle = getSongDisplayTitle(song);
  const displayArtist = song.metadata.artistTranslit || song.artist || getSongDisplayArtist(song);
  const levelRange = getLevelRange(song);
  const chartLevels = song.steps
    .map((step) => ({
      label: step.description || step.difficulty || step.style || "Chart",
      level: step.levelRaw || "?",
      style: step.style,
      stepmaker: step.stepmaker,
    }))
    .sort((a, b) => Number(b.level) - Number(a.level));

  return (
    <article className="simfile-entry" aria-expanded={chartsVisible}>
      <button
        aria-expanded={chartsVisible}
        className="simfile-trigger"
        onClick={() => setChartsVisible((visible) => !visible)}
        type="button"
      >
        <div className="simfile-main">
          <h3>{displayTitle}</h3>
          <p>{displayArtist || "Unknown artist"}</p>
        </div>

        <div className="simfile-meta">
          <div>
            <small>BPM</small>
            <strong>{song.bpm?.display ?? "?"}</strong>
          </div>
          <div className="simfile-level">
            <small>LV</small>
            <strong>{levelRange === "Unrated" ? "?" : levelRange}</strong>
          </div>
          <div>
            <small>Charts</small>
            <strong>{song.steps.length}</strong>
          </div>
        </div>
      </button>

      {chartsVisible && (
        <div className="simfile-charts" aria-label={`Chart levels for ${displayTitle}`}>
          {chartLevels.map((chart, index) => (
            <span className="simfile-chart" key={`${song.id}-${chart.style}-${chart.label}-${chart.level}-${index}`}>
              <strong>Lv {chart.level}</strong>
              <span>{chart.label}</span>
              <small>{chart.style} - {chart.stepmaker}</small>
            </span>
          ))}
        </div>
      )}
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
  const allCharts = packs.flatMap((pack) => pack.songs.flatMap((song) => song.steps.map((step) => ({ pack, song, step }))));
  const totalSeconds = records.reduce((sum, song) => sum + (song.audio?.durationSeconds ?? 0), 0);
  const chartCount = allCharts.length;
  const fallbackPack: PackEntry = packs[0] ?? {
    id: "unknown-pack",
    name: "Unknown pack",
    sourcePath: "",
    songCount: 0,
    songs: [],
  };
  const topDownloadedPack = [...packs].sort((a, b) => seededScore(b.id, 800, 9200) - seededScore(a.id, 800, 9200))[0] ?? fallbackPack;
  const topRatedPack = [...packs].sort((a, b) => seededScore(b.id, 35, 50) - seededScore(a.id, 35, 50))[0] ?? fallbackPack;
  const longestAudioPack = [...packs].sort((a, b) => getPackDuration(b) - getPackDuration(a))[0] ?? fallbackPack;
  const levelCounts = new Map<number, number>();
  const styleCounts = new Map<string, number>();

  allCharts.forEach(({ step }) => {
    if (typeof step.level === "number") {
      levelCounts.set(step.level, (levelCounts.get(step.level) ?? 0) + 1);
    }
    styleCounts.set(step.style, (styleCounts.get(step.style) ?? 0) + 1);
  });

  const maxLevelCount = Math.max(1, ...levelCounts.values());
  const maxStyleCount = Math.max(1, ...styleCounts.values());
  const levelBuckets = Array.from(levelCounts.entries())
    .sort(([a], [b]) => a - b)
    .map(([level, count]) => ({
      label: `Lv ${level}`,
      count,
      percent: Math.max(6, Math.round((count / maxLevelCount) * 100)),
    }));

  const styleBuckets = Array.from(styleCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([style, count]) => ({
      label: style,
      count,
      percent: Math.max(6, Math.round((count / maxStyleCount) * 100)),
    }));

  const hardest = allCharts.reduce(
    (winner, item) => ((item.step.level ?? 0) > winner.level ? { pack: item.pack, level: item.step.level ?? 0 } : winner),
    { pack: fallbackPack, level: 0 },
  );

  return {
    packName: `${packs.length} SMZIP packs`,
    songCount: records.length,
    chartCount,
    totalMinutes: Math.round(totalSeconds / 60),
    mostDownloaded: {
      pack: topDownloadedPack,
      downloads: seededScore(topDownloadedPack.id, 800, 9200),
    },
    bestRated: {
      pack: topRatedPack,
      rating: seededScore(topRatedPack.id, 35, 50) / 10,
    },
    hardest,
    longestAudio: {
      pack: longestAudioPack,
      duration: getPackDuration(longestAudioPack),
    },
    levelBuckets,
    styleBuckets,
  };
}

export default App;
