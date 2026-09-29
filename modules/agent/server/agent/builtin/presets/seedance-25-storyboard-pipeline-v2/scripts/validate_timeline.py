#!/usr/bin/env python3
"""Validate a Seedance storyboard timeline ledger.

Usage:
    python validate_timeline.py timeline.json

The validator uses Decimal arithmetic so displayed 0.1-second values are checked
without binary floating-point drift. It prints errors and warnings and exits 1
when any error is present.
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


def decimal_value(value: Any, field: str, errors: list[str]) -> Decimal:
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError):
        errors.append(f"{field}: expected decimal seconds, got {value!r}")
        return Decimal("0")
    if not result.is_finite():
        errors.append(f"{field}: value must be finite")
        return Decimal("0")
    return result


def require_mapping(value: Any, field: str, errors: list[str]) -> dict[str, Any]:
    if not isinstance(value, dict):
        errors.append(f"{field}: expected object")
        return {}
    return value


def require_list(value: Any, field: str, errors: list[str]) -> list[Any]:
    if not isinstance(value, list):
        errors.append(f"{field}: expected array")
        return []
    return value


def validate(data: dict[str, Any]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    profile = data.get("profile")
    allowed_profiles = {"adaptive", "exact_25_30_8", "extended"}
    if profile not in allowed_profiles:
        errors.append(
            "profile: expected adaptive, exact_25_30_8, or extended"
        )

    total_duration = decimal_value(
        data.get("total_duration"), "total_duration", errors
    )
    if total_duration <= 0:
        errors.append("total_duration: must be greater than zero")

    extended_min = Decimal("0")
    extended_max = Decimal("0")
    if profile == "extended":
        limits = require_mapping(data.get("limits"), "limits", errors)
        extended_min = decimal_value(
            limits.get("min_segment_duration"),
            "limits.min_segment_duration",
            errors,
        )
        extended_max = decimal_value(
            limits.get("max_segment_duration"),
            "limits.max_segment_duration",
            errors,
        )
        if extended_min <= 0 or extended_max < extended_min:
            errors.append("limits: extended min/max duration is invalid")

    segments = require_list(data.get("segments"), "segments", errors)
    if not segments:
        errors.append("segments: at least one segment is required")

    segment_ids: set[str] = set()
    shot_locations: dict[str, str] = {}
    dialogue_occurrences: Counter[str] = Counter()
    expected_segment_start = Decimal("0")
    expected_shot_number = 1

    for segment_index, raw_segment in enumerate(segments, start=1):
        segment = require_mapping(raw_segment, f"segments[{segment_index}]", errors)
        segment_id = str(segment.get("id", ""))
        if not segment_id:
            errors.append(f"segments[{segment_index}].id: required")
        elif segment_id in segment_ids:
            errors.append(f"segment {segment_id}: duplicate id")
        segment_ids.add(segment_id)

        start = decimal_value(
            segment.get("start"), f"segment {segment_id}.start", errors
        )
        duration = decimal_value(
            segment.get("duration"), f"segment {segment_id}.duration", errors
        )
        if duration <= 0:
            errors.append(f"segment {segment_id}: duration must be greater than zero")
        if start != expected_segment_start:
            errors.append(
                f"segment {segment_id}: starts at {start}, expected {expected_segment_start}"
            )
        end = start + duration
        if "end" in segment:
            declared_end = decimal_value(
                segment.get("end"), f"segment {segment_id}.end", errors
            )
            if declared_end != end:
                errors.append(
                    f"segment {segment_id}: declared end {declared_end} != {end}"
                )

        if profile == "adaptive":
            if duration < Decimal("5") or duration > Decimal("30"):
                errors.append(
                    f"segment {segment_id}: adaptive duration {duration}s is outside 5-30s"
                )
            elif duration < Decimal("25"):
                warnings.append(
                    f"segment {segment_id}: duration {duration}s misses preferred 25-30s"
                )
        elif profile == "exact_25_30_8":
            if duration < Decimal("25") or duration > Decimal("30"):
                errors.append(
                    f"segment {segment_id}: exact duration {duration}s is outside 25-30s"
                )
        elif profile == "extended":
            if duration < extended_min or duration > extended_max:
                errors.append(
                    f"segment {segment_id}: duration {duration}s is outside configured "
                    f"{extended_min}-{extended_max}s"
                )

        shots = require_list(segment.get("shots"), f"segment {segment_id}.shots", errors)
        if not shots:
            errors.append(f"segment {segment_id}: at least one shot is required")
        if profile == "exact_25_30_8" and len(shots) != 8:
            errors.append(
                f"segment {segment_id}: exact profile requires 8 shots, got {len(shots)}"
            )
        elif profile == "adaptive" and len(shots) != 8:
            warnings.append(
                f"segment {segment_id}: {len(shots)} shots differs from target 8"
            )

        expected_shot_start = start
        for shot_index, raw_shot in enumerate(shots, start=1):
            shot = require_mapping(
                raw_shot, f"segment {segment_id}.shots[{shot_index}]", errors
            )
            shot_id = str(shot.get("id", ""))
            if not shot_id:
                errors.append(
                    f"segment {segment_id}.shots[{shot_index}].id: required"
                )
            elif shot_id in shot_locations:
                errors.append(f"shot {shot_id}: duplicate id")
            else:
                shot_locations[shot_id] = segment_id

            try:
                numeric_shot_id = int(shot_id)
            except ValueError:
                errors.append(f"shot {shot_id!r}: id must be numeric")
            else:
                if numeric_shot_id != expected_shot_number:
                    errors.append(
                        f"shot {shot_id}: expected global shot {expected_shot_number:02d}"
                    )
                expected_shot_number += 1

            shot_start = decimal_value(
                shot.get("start"), f"shot {shot_id}.start", errors
            )
            shot_duration = decimal_value(
                shot.get("duration"), f"shot {shot_id}.duration", errors
            )
            if shot_duration <= 0:
                errors.append(f"shot {shot_id}: duration must be greater than zero")
            if shot_start != expected_shot_start:
                errors.append(
                    f"shot {shot_id}: starts at {shot_start}, expected {expected_shot_start}"
                )
            shot_end = shot_start + shot_duration
            if "end" in shot:
                declared_shot_end = decimal_value(
                    shot.get("end"), f"shot {shot_id}.end", errors
                )
                if declared_shot_end != shot_end:
                    errors.append(
                        f"shot {shot_id}: declared end {declared_shot_end} != {shot_end}"
                    )
            expected_shot_start = shot_end

            dialogue_ids = require_list(
                shot.get("dialogue_ids", []), f"shot {shot_id}.dialogue_ids", errors
            )
            for dialogue_id in dialogue_ids:
                dialogue_occurrences[str(dialogue_id)] += 1

        if expected_shot_start != end:
            errors.append(
                f"segment {segment_id}: shots end at {expected_shot_start}, segment ends at {end}"
            )
        expected_segment_start = end

    if expected_segment_start != total_duration:
        errors.append(
            f"timeline: segments end at {expected_segment_start}, total_duration is {total_duration}"
        )

    dialogues = require_list(data.get("dialogues", []), "dialogues", errors)
    dialogue_ids: set[str] = set()
    for dialogue_index, raw_dialogue in enumerate(dialogues, start=1):
        dialogue = require_mapping(
            raw_dialogue, f"dialogues[{dialogue_index}]", errors
        )
        dialogue_id = str(dialogue.get("id", ""))
        if not dialogue_id:
            errors.append(f"dialogues[{dialogue_index}].id: required")
            continue
        if dialogue_id in dialogue_ids:
            errors.append(f"dialogue {dialogue_id}: duplicate ledger id")
        dialogue_ids.add(dialogue_id)

        count = dialogue_occurrences[dialogue_id]
        if count != 1:
            errors.append(
                f"dialogue {dialogue_id}: appears in {count} shots, expected exactly 1"
            )
        segment_id = str(dialogue.get("segment_id", ""))
        shot_id = str(dialogue.get("shot_id", ""))
        if segment_id not in segment_ids:
            errors.append(
                f"dialogue {dialogue_id}: unknown segment_id {segment_id!r}"
            )
        if shot_id not in shot_locations:
            errors.append(f"dialogue {dialogue_id}: unknown shot_id {shot_id!r}")
        elif shot_locations[shot_id] != segment_id:
            errors.append(
                f"dialogue {dialogue_id}: shot {shot_id} belongs to segment "
                f"{shot_locations[shot_id]}, not {segment_id}"
            )

    for dialogue_id in dialogue_occurrences:
        if dialogue_id not in dialogue_ids:
            errors.append(
                f"dialogue {dialogue_id}: used by a shot but missing from dialogue ledger"
            )

    return errors, warnings


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Usage: python validate_timeline.py <timeline.json>", file=sys.stderr)
        return 2

    path = Path(argv[1])
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError:
        print(f"ERROR file not found: {path}", file=sys.stderr)
        return 2
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR cannot read JSON: {exc}", file=sys.stderr)
        return 2

    if not isinstance(data, dict):
        print("ERROR top-level JSON value must be an object", file=sys.stderr)
        return 2

    errors, warnings = validate(data)
    for message in errors:
        print(f"ERROR {message}")
    for message in warnings:
        print(f"WARNING {message}")
    print(f"RESULT errors={len(errors)} warnings={len(warnings)}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
