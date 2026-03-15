#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

try:
    import edn_format
except ImportError as exc:  # pragma: no cover - exercised in runtime environments
    raise SystemExit(
        "Missing dependency 'edn_format'. Install it with "
        "'python -m pip install edn-format' before running this script."
    ) from exc


SCRIPT_VERSION = 2
DEFAULT_METADATA_URL = "https://www.switchesdb.com/data/metadata.edn"
DEFAULT_SITE_URL = "https://www.switchesdb.com/"
DEFAULT_OUTPUT_DIR = Path("data/switchesdb")
DEFAULT_TIMEOUT_SECONDS = 30
DEFAULT_WORKERS = 8
DEFAULT_USER_AGENT = "BigRedButtonRepo SwitchesDB Sync/1.0"

SOURCE_LABELS = {
    "goat": "ThereminGoat",
    "haata": "HaaTa",
    "pylon": "bluepylons",
}

CLICKY_TOKENS = (
    "click",
    "clicky",
    "blue",
    "green",
    "white",
    "jade",
    "navy",
)

TACTILE_HINT_TOKENS = (
    "brown",
    "tactile",
    "panda",
    "t1",
    "holy",
    "purple",
)


@dataclass(frozen=True)
class CurvePoint:
    displacement: float
    force: float
    stroke: str


@dataclass(frozen=True)
class CatalogItem:
    switch_id: str
    name: str
    source_key: str
    source_label: str
    source_author: str
    source_url: str
    upstream_file: str
    switchesdb_data_url: str
    switchesdb_app_url: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync SwitchesDB metadata and derive BRB-ready switch profiles."
    )
    parser.add_argument(
        "--metadata-url",
        default=DEFAULT_METADATA_URL,
        help=f"SwitchesDB metadata URL. Default: {DEFAULT_METADATA_URL}",
    )
    parser.add_argument(
        "--site-url",
        default=DEFAULT_SITE_URL,
        help=f"SwitchesDB site URL for attribution. Default: {DEFAULT_SITE_URL}",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory. Default: {DEFAULT_OUTPUT_DIR.as_posix()}",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit the number of switches processed. Useful for local smoke tests.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help=f"Number of concurrent curve downloads. Default: {DEFAULT_WORKERS}",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        help=f"Network timeout in seconds. Default: {DEFAULT_TIMEOUT_SECONDS}",
    )
    parser.add_argument(
        "--skip-curves",
        action="store_true",
        help="Generate metadata outputs only and skip curve-derived profiles.",
    )
    parser.add_argument(
        "--allow-curve-failures",
        action="store_true",
        help="Continue and write outputs even if some curve downloads fail.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate outputs even if the upstream metadata hash is unchanged.",
    )
    return parser.parse_args()


def keyword(name: str) -> Any:
    return edn_format.Keyword(name)


def fetch_text(url: str, timeout: int) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": DEFAULT_USER_AGENT,
            "Accept": "text/plain, text/csv, application/octet-stream, */*",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8")


def load_metadata(metadata_url: str, timeout: int) -> tuple[dict[Any, Any], str, str]:
    raw_text = fetch_text(metadata_url, timeout)
    digest = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()
    metadata = edn_format.loads(raw_text)
    return metadata, raw_text, digest


def read_existing_manifest(manifest_path: Path) -> dict[str, Any] | None:
    if not manifest_path.exists():
        return None
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def should_skip_regeneration(
    existing_manifest: dict[str, Any] | None,
    metadata_sha256: str,
    output_dir: Path,
    force: bool,
) -> bool:
    if force or existing_manifest is None:
        return False
    required_files = (
        output_dir / "catalog.json",
        output_dir / "profiles.json",
        output_dir / "manifest.json",
    )
    if any(not path.exists() for path in required_files):
        return False
    existing_inputs = existing_manifest.get("upstream", {})
    if existing_inputs.get("metadataSha256") != metadata_sha256:
        return False
    if existing_manifest.get("scriptVersion") != SCRIPT_VERSION:
        return False
    return True


def isoformat_utc(value: datetime | str | Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        else:
            value = value.astimezone(UTC)
        return value.isoformat().replace("+00:00", "Z")
    return str(value)


def slugify(text: str) -> str:
    slug = text.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug


def strip_source_suffix(filename: str) -> tuple[str, str]:
    match = re.search(r"~([A-Z]{2})\.csv$", filename)
    suffix = match.group(1).lower() if match else "src"
    stem = re.sub(r"~[A-Z]{2}\.csv$", "", filename)
    return stem, suffix


def build_catalog_items(metadata: dict[Any, Any], site_url: str) -> tuple[list[CatalogItem], dict[str, Any], dict[str, Any], str]:
    sources_map = metadata[keyword("sources")]
    reports_map = metadata.get(keyword("reports"), {})
    switches_map = metadata[keyword("switches")]
    metadata_date = isoformat_utc(metadata[keyword("date")])

    source_info: dict[str, Any] = {}
    for source_key_obj, source_meta in sources_map.items():
        source_key = source_key_obj.name
        report_meta = reports_map.get(source_key_obj, {})
        source_info[source_key] = {
            "key": source_key,
            "label": SOURCE_LABELS.get(source_key, source_key),
            "author": str(source_meta.get(keyword("author"), SOURCE_LABELS.get(source_key, source_key))),
            "url": str(source_meta.get(keyword("url"), site_url)),
            "report": {
                key.name if hasattr(key, "name") else str(key): int(value)
                for key, value in report_meta.items()
            }
            if report_meta
            else {},
        }

    items: list[CatalogItem] = []
    source_counts = {key: 0 for key in source_info}

    for upstream_file_obj, switch_meta in switches_map.items():
        upstream_file = str(upstream_file_obj)
        source_key_obj = switch_meta.get(keyword("source"))
        if source_key_obj is None:
            continue
        source_key = source_key_obj.name
        source_entry = source_info[source_key]
        display_name, source_suffix = strip_source_suffix(upstream_file)
        switch_id = f"{slugify(display_name)}-{source_suffix}"
        data_url = urllib.parse.urljoin(site_url, f"data/{urllib.parse.quote(upstream_file)}")
        app_url = f"{site_url.rstrip('/')}/#{urllib.parse.quote(upstream_file)}"
        items.append(
            CatalogItem(
                switch_id=switch_id,
                name=display_name,
                source_key=source_key,
                source_label=source_entry["label"],
                source_author=source_entry["author"],
                source_url=source_entry["url"],
                upstream_file=upstream_file,
                switchesdb_data_url=data_url,
                switchesdb_app_url=app_url,
            )
        )
        source_counts[source_key] = source_counts.get(source_key, 0) + 1

    items.sort(key=lambda item: (item.name.casefold(), item.source_key, item.upstream_file.casefold()))
    return items, source_info, source_counts, metadata_date


def parse_curve_csv(csv_text: str) -> list[CurvePoint]:
    reader = csv.DictReader(io.StringIO(csv_text))
    points: list[CurvePoint] = []
    for row in reader:
        try:
            displacement = float(row["displacement"])
            force = float(row["force"])
            stroke = (row.get("stroke") or "down").strip().lower()
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"Unexpected curve row: {row}") from exc
        points.append(CurvePoint(displacement=displacement, force=force, stroke=stroke))
    if not points:
        raise ValueError("Curve CSV contained no data rows.")
    return points


def mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def round_value(value: float, digits: int = 3) -> float:
    return round(float(value), digits)


def sample_curve_points(points: list[CurvePoint], max_points: int = 40) -> list[list[float]]:
    if not points:
        return []
    ordered = sorted(points, key=lambda point: (point.displacement, point.force))
    if len(ordered) <= max_points:
        indices = list(range(len(ordered)))
    else:
        indices = sorted(
            {
                round(i * (len(ordered) - 1) / (max_points - 1))
                for i in range(max_points)
            }
        )
    return [
        [round_value(ordered[index].displacement, 3), round_value(ordered[index].force, 3)]
        for index in indices
    ]


def derive_metrics(item: CatalogItem, points: list[CurvePoint]) -> dict[str, Any]:
    downstroke = sorted(
        [point for point in points if point.stroke == "down"],
        key=lambda point: (point.displacement, point.force),
    )
    if not downstroke:
        downstroke = sorted(points, key=lambda point: (point.displacement, point.force))
    upstroke = sorted(
        [point for point in points if point.stroke != "down"],
        key=lambda point: (point.displacement, point.force),
    )

    total_travel_mm = max(point.displacement for point in downstroke)
    peak_point = max(downstroke, key=lambda point: point.force)
    peak_force_gf = peak_point.force
    start_force_gf = mean([point.force for point in downstroke[:3]])
    bottom_candidates = [
        point.force for point in downstroke if point.displacement >= total_travel_mm * 0.92
    ] or [downstroke[-1].force]
    bottom_out_force_gf = mean(bottom_candidates)

    feature_window = [
        point for point in downstroke if point.displacement <= total_travel_mm * 0.7
    ] or downstroke
    feature_peak_point = max(feature_window, key=lambda point: point.force)
    post_peak_window = [
        point.force
        for point in downstroke
        if point.displacement > feature_peak_point.displacement
        and point.displacement <= total_travel_mm * 0.85
    ]
    if not post_peak_window:
        post_peak_window = [
            point.force for point in downstroke if point.displacement > feature_peak_point.displacement
        ]
    post_peak_min_gf = min(post_peak_window) if post_peak_window else feature_peak_point.force
    tactile_bump_gf = max(0.0, feature_peak_point.force - post_peak_min_gf)
    tactile_bump_ratio = tactile_bump_gf / feature_peak_point.force if feature_peak_point.force else 0.0
    snap_at = feature_peak_point.displacement / total_travel_mm if total_travel_mm else 0.0

    family, family_reason = classify_family(item.name, tactile_bump_gf, tactile_bump_ratio)
    is_silent = "silent" in item.name.lower()

    travel_norm = clamp((total_travel_mm - 3.0) / 1.2, 0.0, 1.0)
    peak_force_norm = clamp((peak_force_gf - 35.0) / 55.0, 0.0, 1.0)
    bottom_force_norm = clamp((bottom_out_force_gf - 40.0) / 55.0, 0.0, 1.0)
    bump_norm = clamp(tactile_bump_gf / 22.0, 0.0, 1.0)

    if family == "clicky":
        clickiness = 0.88
    elif family == "tactile":
        clickiness = 0.36
    else:
        clickiness = 0.12
    if is_silent:
        clickiness *= 0.35

    press_duration_ms = round(
        92 + peak_force_norm * 34 + bottom_force_norm * 10 + travel_norm * 18 + bump_norm * 10
    )
    return_duration_ms = round(74 + travel_norm * 24 + bump_norm * 16 + clickiness * 10)
    travel_depth = round_value(0.62 + travel_norm * 0.24 + bottom_force_norm * 0.06, 3)
    overshoot = round_value(0.028 + bump_norm * 0.05 + clickiness * 0.03, 3)
    wobble = round_value(0.012 + peak_force_norm * 0.012 + travel_norm * 0.008, 3)
    wave_peak = round_value(0.88 + peak_force_norm * 0.42 + bump_norm * 0.14, 3)
    wave_tail = round_value(0.28 + travel_norm * 0.22 + bump_norm * 0.18, 3)

    sound_attack = "muted" if is_silent else "sharp" if family == "clicky" else "firm"
    thock = round_value(
        clamp(0.24 + travel_norm * 0.34 + bottom_force_norm * 0.22 - clickiness * 0.08, 0.0, 1.0),
        3,
    )

    return {
        "id": item.switch_id,
        "family": family,
        "familyReason": family_reason,
        "isSilent": is_silent,
        "animationProfile": {
            "travelDepth": travel_depth,
            "pressDurationMs": press_duration_ms,
            "returnDurationMs": return_duration_ms,
            "snapAt": round_value(clamp(snap_at if family != "linear" else 0.84, 0.18, 0.92), 3),
            "overshoot": overshoot,
            "wobble": wobble,
        },
        "soundProfile": {
            "attack": sound_attack,
            "clickiness": round_value(clickiness, 3),
            "thock": thock,
        },
        "telemetryProfile": {
            "wavePeak": wave_peak,
            "waveTail": wave_tail,
        },
        "curve": {
            "down": sample_curve_points(downstroke),
            "up": sample_curve_points(upstroke),
            "maxForceGf": round_value(max(point.force for point in points), 3),
            "maxTravelMm": round_value(max(point.displacement for point in points), 3),
        },
        "metrics": {
            "startForceGf": round_value(start_force_gf, 3),
            "peakForceGf": round_value(peak_force_gf, 3),
            "bottomOutForceGf": round_value(bottom_out_force_gf, 3),
            "totalTravelMm": round_value(total_travel_mm, 3),
            "featureForceGf": round_value(feature_peak_point.force, 3),
            "featureTravelMm": round_value(feature_peak_point.displacement, 3),
            "peakForceTravelMm": round_value(peak_point.displacement, 3),
            "tactileBumpGf": round_value(tactile_bump_gf, 3),
            "tactileBumpRatio": round_value(tactile_bump_ratio, 3),
        },
    }


def classify_family(name: str, tactile_bump_gf: float, tactile_bump_ratio: float) -> tuple[str, str]:
    lowered = name.lower()
    if any(token in lowered for token in CLICKY_TOKENS) and tactile_bump_gf >= 4.0:
        return "clicky", "name-and-curve"
    if tactile_bump_gf >= 6.0 and tactile_bump_ratio >= 0.12:
        return "tactile", "curve-bump"
    if any(token in lowered for token in TACTILE_HINT_TOKENS) and tactile_bump_gf >= 3.0:
        return "tactile", "name-hint"
    return "linear", "flat-curve"


def build_catalog_payload(
    items: list[CatalogItem],
    profiles_by_id: dict[str, dict[str, Any]],
    site_url: str,
    metadata_date: str,
) -> dict[str, Any]:
    catalog_items: list[dict[str, Any]] = []
    for item in items:
        profile = profiles_by_id.get(item.switch_id)
        metrics = profile.get("metrics") if profile else {}
        catalog_items.append(
            {
                "id": item.switch_id,
                "name": item.name,
                "family": profile.get("family") if profile else "unknown",
                "isSilent": profile.get("isSilent") if profile else False,
                "sourceKey": item.source_key,
                "sourceLabel": item.source_label,
                "sourceAuthor": item.source_author,
                "sourceUrl": item.source_url,
                "upstreamFile": item.upstream_file,
                "switchesDbDataUrl": item.switchesdb_data_url,
                "switchesDbAppUrl": item.switchesdb_app_url,
                "metrics": {
                    "peakForceGf": metrics.get("peakForceGf"),
                    "bottomOutForceGf": metrics.get("bottomOutForceGf"),
                    "totalTravelMm": metrics.get("totalTravelMm"),
                    "tactileBumpGf": metrics.get("tactileBumpGf"),
                },
            }
        )
    return {
        "generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "sourceSite": site_url,
        "upstreamMetadataDate": metadata_date,
        "switchCount": len(catalog_items),
        "items": catalog_items,
    }


def build_manifest_payload(
    site_url: str,
    metadata_url: str,
    metadata_date: str,
    metadata_sha256: str,
    source_info: dict[str, Any],
    source_counts: dict[str, int],
    catalog_count: int,
    profile_count: int,
    curve_failures: list[dict[str, str]],
    skip_curves: bool,
) -> dict[str, Any]:
    credits = [{"name": "SwitchesDB", "url": site_url}]
    credits.extend(
        {
            "name": source_info[key]["label"],
            "url": source_info[key]["url"],
        }
        for key in sorted(source_info)
    )
    sources = [
        {
            "key": key,
            "label": source_info[key]["label"],
            "author": source_info[key]["author"],
            "url": source_info[key]["url"],
            "switchCount": source_counts.get(key, 0),
            "report": source_info[key]["report"],
        }
        for key in sorted(source_info)
    ]
    return {
        "generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "scriptVersion": SCRIPT_VERSION,
        "upstream": {
            "site": site_url,
            "metadataUrl": metadata_url,
            "metadataDate": metadata_date,
            "metadataSha256": metadata_sha256,
        },
        "outputs": {
            "catalogCount": catalog_count,
            "profileCount": profile_count,
            "profileMode": "metadata-only" if skip_curves else "curve-derived",
            "curveFailureCount": len(curve_failures),
        },
        "curveFailures": curve_failures,
        "sources": sources,
        "credits": credits,
    }


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=False, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )


def fetch_profile(item: CatalogItem, timeout: int) -> tuple[str, dict[str, Any]]:
    csv_text = fetch_text(item.switchesdb_data_url, timeout)
    points = parse_curve_csv(csv_text)
    return item.switch_id, derive_metrics(item, points)


def build_profiles(
    items: list[CatalogItem],
    workers: int,
    timeout: int,
) -> tuple[dict[str, dict[str, Any]], list[dict[str, str]]]:
    profiles_by_id: dict[str, dict[str, Any]] = {}
    failures: list[dict[str, str]] = []

    with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        future_map = {executor.submit(fetch_profile, item, timeout): item for item in items}
        for future in as_completed(future_map):
            item = future_map[future]
            try:
                switch_id, profile = future.result()
            except Exception as exc:  # pragma: no cover - network and parsing failures
                failures.append(
                    {
                        "id": item.switch_id,
                        "upstreamFile": item.upstream_file,
                        "reason": str(exc),
                    }
                )
                continue
            profiles_by_id[switch_id] = profile

    return profiles_by_id, sorted(failures, key=lambda failure: failure["id"])


def main() -> int:
    args = parse_args()
    output_dir = args.output_dir
    manifest_path = output_dir / "manifest.json"

    metadata, _metadata_text, metadata_sha256 = load_metadata(args.metadata_url, args.timeout)
    existing_manifest = read_existing_manifest(manifest_path)
    if should_skip_regeneration(existing_manifest, metadata_sha256, output_dir, args.force):
        print("SwitchesDB metadata unchanged; skipping regeneration.")
        return 0

    items, source_info, source_counts, metadata_date = build_catalog_items(metadata, args.site_url)
    if args.limit is not None:
        items = items[: max(0, args.limit)]
        source_counts = {}
        for item in items:
            source_counts[item.source_key] = source_counts.get(item.source_key, 0) + 1

    profiles_by_id: dict[str, dict[str, Any]] = {}
    curve_failures: list[dict[str, str]] = []
    if not args.skip_curves:
        print(f"Fetching and deriving profiles for {len(items)} switches...")
        profiles_by_id, curve_failures = build_profiles(items, args.workers, args.timeout)
        if curve_failures:
            print(f"Encountered {len(curve_failures)} curve failures.", file=sys.stderr)
            if not args.allow_curve_failures:
                for failure in curve_failures[:20]:
                    print(
                        f"- {failure['upstreamFile']}: {failure['reason']}",
                        file=sys.stderr,
                    )
                raise SystemExit(
                    "Curve download/parsing failed. Re-run with --allow-curve-failures "
                    "if you want to write partial outputs."
                )

    catalog_payload = build_catalog_payload(items, profiles_by_id, args.site_url, metadata_date)
    profiles_payload = {
        "generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "sourceSite": args.site_url,
        "upstreamMetadataDate": metadata_date,
        "items": [profiles_by_id[switch_id] for switch_id in sorted(profiles_by_id)],
    }
    manifest_payload = build_manifest_payload(
        site_url=args.site_url,
        metadata_url=args.metadata_url,
        metadata_date=metadata_date,
        metadata_sha256=metadata_sha256,
        source_info=source_info,
        source_counts=source_counts,
        catalog_count=len(catalog_payload["items"]),
        profile_count=len(profiles_payload["items"]),
        curve_failures=curve_failures,
        skip_curves=args.skip_curves,
    )

    write_json(output_dir / "catalog.json", catalog_payload)
    write_json(output_dir / "profiles.json", profiles_payload)
    write_json(output_dir / "manifest.json", manifest_payload)

    print(f"Wrote {output_dir / 'catalog.json'}")
    print(f"Wrote {output_dir / 'profiles.json'}")
    print(f"Wrote {output_dir / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
