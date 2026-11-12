#!/usr/bin/env python3
"""Arrange a raw proto extraction in the existing schema's declaration order."""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
from collections import Counter
from pathlib import Path


DECLARATION_RE = re.compile(r"(?m)^[ \t]*(message|enum)\s+([A-Za-z_]\w*)\s*\{")
FIELD_RE = re.compile(
    r"(?m)^\s*(?:(repeated|optional|required)\s+)?"
    r"(map\s*<[^>]+>|[A-Za-z_][\w.]*)\s+([A-Za-z_]\w*)\s*=\s*(\d+)\b"
)
ENUM_VALUE_RE = re.compile(r"(?m)^\s*([A-Za-z_]\w*)\s*=\s*(-?\d+)\b")
FIELD_LINE_RE = re.compile(
    r"(?m)^([ \t]*)(?:(repeated|optional|required)[ \t]+)?"
    r"(map[ \t]*<[^>\r\n]+>|[A-Za-z_][\w.]*)[ \t]+"
    r"([A-Za-z_]\w*)[ \t]*=[ \t]*(\d+)([ \t]*;[^\r\n]*)"
)
ENUM_VALUE_LINE_RE = re.compile(
    r"(?m)^([ \t]*)([A-Za-z_]\w*)([ \t]*=[ \t]*)(-?\d+)(\b[^;\r\n]*;)"
)
VERSION_RE = re.compile(r"labeled\s+([A-Za-z0-9._-]+)", re.IGNORECASE)
SCALAR_TYPES = {
    "double",
    "float",
    "int32",
    "int64",
    "uint32",
    "uint64",
    "sint32",
    "sint64",
    "fixed32",
    "fixed64",
    "sfixed32",
    "sfixed64",
    "bool",
    "string",
    "bytes",
}


def find_block_end(text: str, opening_brace: int) -> int:
    depth = 0
    state = "normal"
    quote = ""
    index = opening_brace

    while index < len(text):
        char = text[index]
        next_char = text[index + 1] if index + 1 < len(text) else ""

        if state == "line_comment":
            if char == "\n":
                state = "normal"
        elif state == "block_comment":
            if char == "*" and next_char == "/":
                state = "normal"
                index += 1
        elif state == "string":
            if char == "\\":
                index += 1
            elif char == quote:
                state = "normal"
        elif char == "/" and next_char == "/":
            state = "line_comment"
            index += 1
        elif char == "/" and next_char == "*":
            state = "block_comment"
            index += 1
        elif char in ('"', "'"):
            state = "string"
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return index + 1

        index += 1

    raise ValueError(f"unclosed declaration at character {opening_brace}")


def extract_declarations(text: str) -> dict[tuple[str, str], str]:
    declarations: dict[tuple[str, str], str] = {}
    cursor = 0

    while True:
        match = DECLARATION_RE.search(text, cursor)
        if match is None:
            break
        key = (match.group(1), match.group(2))
        end = find_block_end(text, match.end() - 1)
        if key in declarations:
            raise ValueError(f"duplicate {key[0]} declaration: {key[1]}")
        declarations[key] = text[match.start() : end]
        cursor = end

    return declarations


def strip_dump_comments(declaration: str) -> str:
    lines = []
    for line in declaration.splitlines():
        if re.match(r"\s*//\s*WriteTo:", line):
            continue
        line = re.sub(r"\s*//\s*offset:\s*\d+\s*$", "", line)
        lines.append(line)
    return "\n".join(lines).strip()


def is_readable_field_name(name: str) -> bool:
    return any(char.islower() for char in name) or "_" in name


def is_obfuscated_enum_value(name: str, enum_name: str) -> bool:
    suffix = name
    prefix = f"{enum_name}_"
    if suffix.startswith(prefix):
        suffix = suffix[len(prefix) :]
    return bool(re.fullmatch(r"[A-Z0-9]{8,}", suffix))


def field_type_is_available(field_type: str, known_types: set[str]) -> bool:
    field_type = field_type.strip()
    if field_type in SCALAR_TYPES:
        return True
    map_match = re.fullmatch(
        r"map\s*<\s*([A-Za-z_]\w*)\s*,\s*([A-Za-z_]\w*)\s*>",
        field_type,
    )
    if map_match:
        key_type, value_type = map_match.groups()
        return key_type in SCALAR_TYPES and (
            value_type in SCALAR_TYPES or value_type in known_types
        )
    return field_type in known_types


def fallback_field_type(
    raw_type: str,
    base_type: str | None,
    known_types: set[str],
) -> str:
    if field_type_is_available(raw_type, known_types):
        return raw_type
    if base_type and field_type_is_available(base_type, known_types):
        return base_type

    map_match = re.fullmatch(
        r"map\s*<\s*([A-Za-z_]\w*)\s*,\s*([A-Za-z_]\w*)\s*>",
        raw_type,
    )
    if map_match and map_match.group(1) in SCALAR_TYPES:
        return f"map<{map_match.group(1)}, bytes>"
    return "bytes"


def update_message_names(
    raw_declaration: str,
    base_declaration: str,
    known_types: set[str],
) -> str:
    raw_fields = list(FIELD_LINE_RE.finditer(raw_declaration))
    base_fields = list(FIELD_LINE_RE.finditer(base_declaration))
    available_base = set(range(len(base_fields)))
    raw_to_base: dict[int, int] = {}

    for raw_index, raw_field in enumerate(raw_fields):
        for base_index in sorted(available_base):
            if raw_field.group(4) == base_fields[base_index].group(4):
                raw_to_base[raw_index] = base_index
                available_base.remove(base_index)
                break

    remaining_raw = [
        index for index in range(len(raw_fields)) if index not in raw_to_base
    ]
    readable_base = [
        index
        for index in sorted(available_base)
        if is_readable_field_name(base_fields[index].group(4))
    ]
    for raw_index, base_index in zip(remaining_raw, readable_base):
        raw_to_base[raw_index] = base_index

    base_to_raw = {base_index: raw_index for raw_index, base_index in raw_to_base.items()}
    raw_tags = {int(field.group(5)) for field in raw_fields}
    replacements = []
    for base_index, base_field in enumerate(base_fields):
        raw_index = base_to_raw.get(base_index)
        if raw_index is None:
            if (
                is_readable_field_name(base_field.group(4))
                and int(base_field.group(5)) not in raw_tags
            ):
                continue
            replacement = ""
        else:
            raw_field = raw_fields[raw_index]
            field_type = fallback_field_type(
                raw_field.group(3), base_field.group(3), known_types
            )
            cardinality = raw_field.group(2) or base_field.group(2)
            replacement = "".join(
                (
                    base_field.group(1),
                    cardinality + " " if cardinality else "",
                    field_type,
                    " ",
                    base_field.group(4),
                    " = ",
                    raw_field.group(5),
                    raw_field.group(6),
                )
            )
        replacements.append(
            (base_field.start(), base_field.end(), replacement)
        )

    result = base_declaration
    for start, end, replacement in reversed(replacements):
        result = result[:start] + replacement + result[end:]

    for raw_index, raw_field in enumerate(raw_fields):
        if raw_index in raw_to_base:
            continue
        field_type = fallback_field_type(raw_field.group(3), None, known_types)
        cardinality = raw_field.group(2)
        indent = base_fields[0].group(1) if base_fields else "\t"
        line = (
            f"{indent}{cardinality + ' ' if cardinality else ''}"
            f"{field_type} {raw_field.group(4)} = {raw_field.group(5)}"
            f"{raw_field.group(6)}\n"
        )
        closing_brace = result.rfind("}")
        result = result[:closing_brace] + line + result[closing_brace:]

    result = re.sub(
        r"(?ms)^[ \t]*oneof[ \t]+[A-Za-z_]\w*[ \t]*\{\s*\}",
        "",
        result,
    )
    return result


def update_enum_names(raw_declaration: str, base_declaration: str) -> str:
    enum_match = DECLARATION_RE.search(raw_declaration)
    if enum_match is None:
        return raw_declaration
    enum_name = enum_match.group(2)
    raw_values = list(ENUM_VALUE_LINE_RE.finditer(raw_declaration))
    base_values = list(ENUM_VALUE_LINE_RE.finditer(base_declaration))
    available_base = set(range(len(base_values)))
    raw_to_base: dict[int, int] = {}

    for raw_index, raw_value in enumerate(raw_values):
        raw_name = raw_value.group(2)
        for base_index in sorted(available_base):
            base_name = base_values[base_index].group(2)
            if raw_name == base_name:
                raw_to_base[raw_index] = base_index
                available_base.remove(base_index)
                break
            prefix = f"{enum_name}_"
            if base_name.startswith(prefix) and base_name[len(prefix) :] == raw_name:
                raw_to_base[raw_index] = base_index
                available_base.remove(base_index)
                break

    remaining_raw = [
        index for index in range(len(raw_values)) if index not in raw_to_base
    ]
    readable_base = [
        index
        for index in sorted(available_base)
        if not is_obfuscated_enum_value(base_values[index].group(2), enum_name)
    ]
    for raw_index, base_index in zip(remaining_raw, readable_base):
        raw_to_base[raw_index] = base_index

    replacements = []
    for raw_index, raw_value in enumerate(raw_values):
        base_value = (
            base_values[raw_to_base[raw_index]]
            if raw_index in raw_to_base
            else None
        )
        value_name = base_value.group(2) if base_value else raw_value.group(2)
        if base_value is None and is_obfuscated_enum_value(value_name, enum_name):
            value_name = f"{enum_name}_{value_name}"
        replacements.append(
            (
                raw_value.start(),
                raw_value.end(),
                "".join(
                    (
                        raw_value.group(1),
                        value_name,
                        raw_value.group(3),
                        raw_value.group(4),
                        raw_value.group(5),
                    )
                ),
            )
        )

    result = raw_declaration
    for start, end, replacement in reversed(replacements):
        result = result[:start] + replacement + result[end:]
    return result


def qualify_duplicate_enum_values(blocks: list[str]) -> list[str]:
    values = [
        name
        for block in blocks
        if re.match(r"\s*enum\b", block)
        for name, _ in ENUM_VALUE_RE.findall(block)
    ]
    counts = Counter(values)
    updated = []
    used = set()

    for block in blocks:
        match = DECLARATION_RE.search(block)
        if match is None or match.group(1) != "enum":
            updated.append(block)
            continue
        enum_name = match.group(2)

        def qualify(value_match: re.Match[str]) -> str:
            name = value_match.group(2)
            if counts[name] > 1:
                name = f"{enum_name}_{name}"
            candidate = name
            suffix = 2
            while candidate in used:
                candidate = f"{name}_{suffix}"
                suffix += 1
            used.add(candidate)
            return (
                value_match.group(1)
                + candidate
                + value_match.group(3)
                + value_match.group(4)
                + value_match.group(5)
            )

        updated.append(ENUM_VALUE_LINE_RE.sub(qualify, block))
    return updated


def parse_fields(declaration: str) -> dict[int, tuple[str, str, str]]:
    fields = {}
    for cardinality, field_type, name, number in FIELD_RE.findall(declaration):
        tag = int(number)
        if tag in fields:
            raise ValueError(f"duplicate field tag {tag} in message")
        fields[tag] = (cardinality or "", field_type.strip(), name)
    return fields


def declaration_label(key: tuple[str, str]) -> str:
    return f"{key[0]} {key[1]}"


def compare_declarations(
    base: dict[tuple[str, str], str],
    raw: dict[tuple[str, str], str],
) -> tuple[list[str], Counter[str]]:
    base_keys = set(base)
    raw_keys = set(raw)
    common = sorted(base_keys & raw_keys)
    changed = []
    details = []

    for key in common:
        if key[0] == "message":
            old_items = parse_fields(base[key])
            new_items = parse_fields(raw[key])
            for tag in sorted(set(old_items) | set(new_items)):
                if old_items.get(tag) == new_items.get(tag):
                    continue
                changed.append(key)
                details.append(
                    f"  {declaration_label(key)} tag {tag}: "
                    f"{old_items.get(tag, '(absent)')} -> "
                    f"{new_items.get(tag, '(absent)')}"
                )
        else:
            old_items = {
                name: int(number) for name, number in ENUM_VALUE_RE.findall(base[key])
            }
            new_items = {
                name: int(number) for name, number in ENUM_VALUE_RE.findall(raw[key])
            }
            if old_items != new_items:
                changed.append(key)
                details.append(f"  {declaration_label(key)} values changed")

    stats = Counter(
        base_messages=sum(key[0] == "message" for key in base),
        base_enums=sum(key[0] == "enum" for key in base),
        raw_messages=sum(key[0] == "message" for key in raw),
        raw_enums=sum(key[0] == "enum" for key in raw),
        shared=len(common),
        changed=len(set(changed)),
        base_only=len(base_keys - raw_keys),
        raw_only=len(raw_keys - base_keys),
        output=len(base_keys),
    )
    return details, stats


def make_output(
    raw_text: str,
    base: dict[tuple[str, str], str],
    raw: dict[tuple[str, str], str],
) -> str:
    version_match = VERSION_RE.search(raw_text)
    version = version_match.group(1).rstrip(".") if version_match else "raw"
    header = f'syntax = "proto3"; // GameVersion: {version}'

    known_types = {name for _, name in base}
    blocks = []
    for key in base:
        if key not in raw:
            blocks.append(base[key])
        elif key[0] == "message":
            blocks.append(
                strip_dump_comments(
                    update_message_names(raw[key], base[key], known_types)
                )
            )
        else:
            blocks.append(
                strip_dump_comments(update_enum_names(raw[key], base[key]))
            )
    blocks = qualify_duplicate_enum_values(blocks)
    return header + "\n\n" + "\n\n".join(blocks) + "\n"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def make_report(
    base_path: Path,
    source_path: Path,
    output_path: Path,
    base: dict[tuple[str, str], str],
    raw: dict[tuple[str, str], str],
    details: list[str],
    stats: Counter[str],
) -> str:
    collision_counts = Counter(name for _, name in base.keys() | raw.keys())
    collisions = sorted(name for name, count in collision_counts.items() if count > 1)
    lines = [
        f"Base file: {base_path}",
        f"Base SHA256: {sha256(base_path)}",
        f"Raw source: {source_path}",
        f"Raw SHA256: {sha256(source_path)}",
        f"Output: {output_path}",
        "",
        "Raw proto arrangement report",
        "=============================",
        f"Base messages/enums:   {stats['base_messages']} / {stats['base_enums']}",
        f"Raw messages/enums:    {stats['raw_messages']} / {stats['raw_enums']}",
        f"Same-name declarations: {stats['shared']}",
        f"Changed same-name declarations: {stats['changed']}",
        f"Base-only declarations kept unchanged: {stats['base_only']}",
        f"Raw-only declarations ignored: {stats['raw_only']}",
        f"Total output declarations:       {stats['output']}",
        "",
        "The output keeps exactly the declarations from the base file, in their",
        "original order. Matching declarations use raw field/value numbers, while",
        "existing readable field and enum value names are retained where possible.",
        "Unavailable raw field types fall back to the existing type or bytes;",
        "base-only declarations remain unchanged and raw-only declarations are ignored.",
        "",
        "New obfuscated enum values are qualified to avoid protobuf's global",
        "enum-value name collisions. Field tags/types may still change meaning;",
        "this tool does not verify protocol compatibility with the server.",
        "The candidate is not written over StarRail.proto.",
        "",
        "Same-name field changes (field numbers are not semantic name mappings):",
        *(details or ["  (none)"]),
        "",
        "Declaration names used by both message and enum:",
        *(f"  {name}" for name in collisions),
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    proto_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description=(
            "Arrange the raw obfuscated extraction using the existing proto's "
            "declaration order. The original file is never overwritten."
        )
    )
    parser.add_argument("--base", type=Path, default=proto_dir / "StarRail.proto")
    parser.add_argument(
        "--source",
        type=Path,
        default=proto_dir / "StarRail.obfuscated4.7.51.proto",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=proto_dir / "StarRail.raw.updated.candidate.proto",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=proto_dir / "StarRail.raw.update-report.txt",
    )
    args = parser.parse_args()

    base_path = args.base.resolve()
    source_path = args.source.resolve()
    output_path = args.output.resolve()
    report_path = args.report.resolve()
    if base_path == source_path or output_path in (base_path, source_path):
        parser.error("base, source, and output must be separate files")
    if report_path in (base_path, source_path, output_path):
        parser.error("report must be a separate file")

    try:
        base_text = base_path.read_text(encoding="utf-8-sig")
        raw_text = source_path.read_text(encoding="utf-8-sig")
        base = extract_declarations(base_text)
        raw = extract_declarations(raw_text)
        if not base or not raw:
            raise ValueError("could not find message or enum declarations")

        details, stats = compare_declarations(base, raw)
        output = make_output(raw_text, base, raw)
        report = make_report(
            base_path, source_path, output_path, base, raw, details, stats
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output, encoding="utf-8")
        report_path.write_text(report, encoding="utf-8")
    except (OSError, UnicodeError, ValueError) as error:
        print(f"update_proto.py: error: {error}", file=sys.stderr)
        return 1

    print(f"Raw candidate written: {output_path}")
    print(f"Change report written: {report_path}")
    print(
        f"{stats['raw_messages']} raw messages and {stats['raw_enums']} raw enums; "
        f"{stats['shared']} declarations matched by name, "
        f"{stats['base_only']} base-only declarations kept, "
        f"{stats['raw_only']} raw-only declarations ignored."
    )
    print("StarRail.proto and the raw source were not modified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
