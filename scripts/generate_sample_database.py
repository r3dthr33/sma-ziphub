from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


PACK_DIR = Path(r"E:\Games\StepMania AMX 6\Songs\Aldo_MX")
OUTPUT_FILE = Path("data/sample-database.json")

AUDIO_EXTENSIONS = {".mp3", ".ogg", ".oga", ".wav", ".flac", ".aac", ".m4a", ".opus", ".wma"}
CHART_EXTENSIONS = {".sma", ".msd", ".sm", ".ssc", ".ucs"}
STEP_TYPES = {
    "dance-single",
    "dance-double",
    "dance-couple",
    "dance-solo",
    "pump-single",
    "pump-double",
    "pump-halfdouble",
    "pump-couple",
    "ez2-single",
    "ez2-double",
    "ez2-real",
    "para-single",
    "ds3ddx-single",
    "bm-single",
    "bm-double",
    "iidx-single7",
    "iidx-double7",
    "iidx-single5",
    "iidx-double5",
    "maniax-single",
    "maniax-double",
    "techno-single4",
    "techno-single5",
    "techno-single8",
    "techno-double4",
    "techno-double5",
    "pnm-five",
    "pnm-nine",
    "lights-cabinet",
}


def read_text(path: Path) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_text(errors="replace")


def parse_tags(text: str) -> dict[str, str]:
    tags: dict[str, str] = {}
    for match in re.finditer(r"#([A-Za-z0-9_]+)\s*:\s*(.*?);", text, re.DOTALL):
        key = match.group(1).upper()
        value = "\n".join(line.strip() for line in match.group(2).splitlines()).strip()
        if key not in tags:
            tags[key] = value
    return tags


def parse_bpm_values(bpms: str) -> list[float]:
    values: list[float] = []
    for value in re.findall(r"=\s*(-?\d+(?:\.\d+)?)", bpms):
        try:
            values.append(float(value))
        except ValueError:
            pass
    return values


def bpm_summary(bpms: str) -> dict[str, object] | None:
    values = parse_bpm_values(bpms)
    if not values:
        return None
    unique_values = sorted(set(values))
    return {
        "display": "/".join(format_number(value) for value in unique_values),
        "min": min(values),
        "max": max(values),
        "changes": len(values),
        "raw": bpms,
    }


def format_number(value: float) -> str:
    if value.is_integer():
        return str(int(value))
    return f"{value:.3f}".rstrip("0").rstrip(".")


def parse_notes(text: str, source_name: str) -> list[dict[str, object]]:
    charts: list[dict[str, object]] = []
    for match in re.finditer(r"#NOTES\s*:\s*(.*?);", text, re.DOTALL | re.IGNORECASE):
        fields = [line.strip() for line in match.group(1).splitlines() if line.strip()]
        if len(fields) < 5:
            continue

        style = fields[0].rstrip(":").strip()
        description = fields[1].rstrip(":").strip()
        difficulty = fields[2].rstrip(":").strip()
        meter_text = fields[3].rstrip(":").strip()
        radar = fields[4].rstrip(":").strip()

        chart: dict[str, object] = {
            "sourceFile": source_name,
            "style": style,
            "styleIsKnown": style in STEP_TYPES,
            "description": description,
            "difficulty": difficulty,
            "level": parse_int(meter_text),
            "levelRaw": meter_text,
            "radarValues": [parse_float(value) for value in radar.split(",") if value.strip()],
        }
        charts.append(chart)
    return charts


def parse_ucs_chart(path: Path) -> dict[str, object]:
    name = path.stem
    style = "pump-single"
    if re.search(r"double|dp", name, re.IGNORECASE):
        style = "pump-double"
    level_match = re.search(r"(?:^|[^0-9])(\d{1,2})(?:[^0-9]|$)", name)
    level_raw = level_match.group(1) if level_match else ""
    return {
        "sourceFile": path.name,
        "style": style,
        "styleIsKnown": style in STEP_TYPES,
        "description": name,
        "difficulty": "",
        "level": parse_int(level_raw),
        "levelRaw": level_raw,
        "radarValues": [],
    }


def parse_int(value: str) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_float(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def audio_duration(path: Path) -> float | None:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(path),
    ]
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        return round(float(result.stdout.strip()), 3)
    except (subprocess.CalledProcessError, ValueError):
        return None


def find_main_audio(song_dir: Path, tags: dict[str, str]) -> dict[str, object] | None:
    tagged_music = tags.get("MUSIC", "")
    candidates = [
        path
        for path in song_dir.iterdir()
        if path.is_file()
        and path.suffix.lower() in AUDIO_EXTENSIONS
        and "preview" not in path.stem.lower()
        and "sample" not in path.stem.lower()
    ]

    if tagged_music:
        tagged_path = song_dir / tagged_music
        for candidate in candidates:
            if candidate.name.lower() == tagged_path.name.lower():
                candidates.remove(candidate)
                candidates.insert(0, candidate)
                break

    if not candidates:
        return None

    path = candidates[0]
    return {
        "file": path.name,
        "durationSeconds": audio_duration(path),
        "sizeBytes": path.stat().st_size,
    }


def build_song_record(song_dir: Path) -> dict[str, object]:
    chart_files = [
        path
        for path in sorted(song_dir.iterdir(), key=lambda item: item.name.lower())
        if path.is_file() and path.suffix.lower() in CHART_EXTENSIONS
    ]
    primary_chart = next((path for path in chart_files if path.suffix.lower() in {".sma", ".msd", ".sm", ".ssc"}), None)

    tags: dict[str, str] = {}
    charts: list[dict[str, object]] = []
    chart_sources: list[str] = []

    for chart_file in chart_files:
        chart_sources.append(chart_file.name)
        if chart_file.suffix.lower() == ".ucs":
            charts.append(parse_ucs_chart(chart_file))
            continue
        text = read_text(chart_file)
        file_tags = parse_tags(text)
        if chart_file == primary_chart:
            tags = file_tags
        charts.extend(parse_notes(text, chart_file.name))

    bpm = bpm_summary(tags.get("BPMS", ""))
    return {
        "id": slugify(song_dir.name),
        "folderName": song_dir.name,
        "title": tags.get("TITLE", ""),
        "artist": tags.get("ARTIST", ""),
        "bpm": bpm,
        "audio": find_main_audio(song_dir, tags),
        "metadata": {
            "subtitle": tags.get("SUBTITLE", ""),
            "titleTranslit": tags.get("TITLETRANSLIT", ""),
            "artistTranslit": tags.get("ARTISTTRANSLIT", ""),
            "genre": tags.get("GENRE", ""),
            "credit": tags.get("CREDIT", ""),
            "music": tags.get("MUSIC", ""),
            "sampleStart": parse_float(tags.get("SAMPLESTART", "")),
            "sampleLength": parse_float(tags.get("SAMPLELENGTH", "")),
            "offset": parse_float(tags.get("OFFSET", "")),
            "selectable": tags.get("SELECTABLE", ""),
            "smaVersion": tags.get("SMAVERSION", ""),
        },
        "chartSources": chart_sources,
        "steps": charts,
    }


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower())
    return slug.strip("-") or "song"


def main() -> None:
    if not PACK_DIR.exists():
        raise SystemExit(f"Pack directory does not exist: {PACK_DIR}")

    songs = [
        build_song_record(path)
        for path in sorted(PACK_DIR.iterdir(), key=lambda item: item.name.lower())
        if path.is_dir()
    ]
    payload = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourcePath": str(PACK_DIR),
        "pack": {
            "name": PACK_DIR.name,
            "songCount": len(songs),
            "songs": songs,
        },
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_FILE} with {len(songs)} songs.")


if __name__ == "__main__":
    main()
