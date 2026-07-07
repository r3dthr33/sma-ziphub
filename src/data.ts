import database from "../data/sample-database.json";
import type { CatalogDatabase, SongRecord, StepChart } from "./types";

export const catalog = database as CatalogDatabase;
export const songs = catalog.pack.songs;

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "Unknown";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export function formatBytes(bytes: number | undefined): string {
  if (!bytes) return "Unknown";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getAllStyles(records: SongRecord[]): string[] {
  return Array.from(new Set(records.flatMap((song) => song.steps.map((step) => step.style)))).sort();
}

export function getLevelRange(song: SongRecord): string {
  const levels = song.steps
    .map((step) => step.level)
    .filter((level): level is number => typeof level === "number");
  if (!levels.length) return "Unrated";
  return `${Math.min(...levels)}-${Math.max(...levels)}`;
}

export function getTopChart(song: SongRecord): StepChart | undefined {
  return [...song.steps]
    .filter((step) => typeof step.level === "number")
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0];
}

export function seededScore(seed: string, min: number, max: number): number {
  const hash = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return min + (hash % (max - min + 1));
}
