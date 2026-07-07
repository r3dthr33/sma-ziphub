export type StepChart = {
  sourceFile: string;
  style: string;
  styleIsKnown: boolean;
  description: string;
  difficulty: string;
  level: number | null;
  levelRaw: string;
  radarValues: Array<number | null>;
};

export type SongRecord = {
  id: string;
  folderName: string;
  title: string;
  artist: string;
  bpm: {
    display: string;
    min: number;
    max: number;
    changes: number;
    raw: string;
  } | null;
  audio: {
    file: string;
    durationSeconds: number | null;
    sizeBytes: number;
  } | null;
  metadata: {
    subtitle: string;
    titleTranslit: string;
    artistTranslit: string;
    genre: string;
    credit: string;
    music: string;
    sampleStart: number | null;
    sampleLength: number | null;
    offset: number | null;
    selectable: string;
    smaVersion: string;
  };
  chartSources: string[];
  steps: StepChart[];
};

export type CatalogDatabase = {
  schemaVersion: number;
  generatedAt: string;
  sourcePath: string;
  pack: {
    name: string;
    songCount: number;
    songs: SongRecord[];
  };
};
