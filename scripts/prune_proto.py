#!/usr/bin/env python3
"""
Star Rail Proto Tree-Shaker / Pruner
Extracts only the required messages/enums from a raw StarRail.proto file,
resolves all recursive dependencies, injects CmdID annotations, and outputs
a minimal, clean .proto file ready for prost-build / Rust compilation.
"""

import sys
import os
import re
import json
import argparse
import subprocess
from typing import Dict, Set, List, Tuple

PRIMITIVES = {
    'double', 'float', 'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64',
    'fixed32', 'fixed64', 'sfixed32', 'sfixed64', 'bool', 'string', 'bytes'
}

class ProtoEntity:
    def __init__(self, name: str, kind: str, raw_content: str):
        self.name = name
        self.kind = kind # 'message' or 'enum'
        self.raw_content = raw_content
        self.dependencies: Set[str] = set()

def parse_proto(filepath: str) -> Tuple[List[str], Dict[str, ProtoEntity]]:
    """Parse a proto file into headers and a dictionary of entities."""
    entities: Dict[str, ProtoEntity] = {}
    header_lines: List[str] = []
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    in_header = True
    current_entity = None
    current_kind = None
    current_lines = []
    brace_count = 0

    for line in lines:
        if in_header:
            stripped = line.strip()
            if stripped.startswith("message ") or stripped.startswith("enum "):
                in_header = False
            else:
                header_lines.append(line)
                continue

        if current_entity is None:
            m_msg = re.match(r'^\s*message\s+(\w+)', line)
            m_enum = re.match(r'^\s*enum\s+(\w+)', line)
            if m_msg:
                current_entity = m_msg.group(1)
                current_kind = 'message'
                current_lines = [line]
                brace_count = line.count('{') - line.count('}')
            elif m_enum:
                current_entity = m_enum.group(1)
                current_kind = 'enum'
                current_lines = [line]
                brace_count = line.count('{') - line.count('}')
        else:
            current_lines.append(line)
            brace_count += line.count('{') - line.count('}')
            if brace_count <= 0:
                raw_text = "".join(current_lines)
                entities[current_entity] = ProtoEntity(current_entity, current_kind, raw_text)
                current_entity = None
                current_kind = None
                current_lines = []
                brace_count = 0

    return header_lines, entities

def extract_dependencies(entities: Dict[str, ProtoEntity]):
    """Extract type dependencies for all message entities."""
    for name, entity in entities.items():
        if entity.kind != 'message':
            continue
        for line in entity.raw_content.splitlines():
            line_str = line.strip()
            if not line_str or line_str.startswith("//"):
                continue

            # Check map<Key, Value>
            m_map = re.search(r'map\s*<\s*(\w+)\s*,\s*(\w+)\s*>', line_str)
            if m_map:
                k, v = m_map.group(1), m_map.group(2)
                if k not in PRIMITIVES and k in entities:
                    entity.dependencies.add(k)
                if v not in PRIMITIVES and v in entities:
                    entity.dependencies.add(v)
                continue

            # Check field: [repeated] Type field_name = tag;
            m_field = re.match(r'(?:repeated\s+)?(\w+)\s+(\w+)\s*=', line_str)
            if m_field:
                t = m_field.group(1)
                if t not in PRIMITIVES and t in entities:
                    entity.dependencies.add(t)

def auto_detect_cmd_ids_from_enums(entities: Dict[str, ProtoEntity]) -> Dict[str, int]:
    """Auto-detect any Packet CmdIDs from enums defined in the proto itself (e.g. CmdPlayerType)."""
    detected = {}
    for name, entity in entities.items():
        if entity.kind == 'enum' and ('cmd' in name.lower() or 'packet' in name.lower()):
            for line in entity.raw_content.splitlines():
                m = re.match(r'^\s*(\w+)\s*=\s*(\d+);', line)
                if m:
                    field_name, field_id = m.group(1), int(m.group(2))
                    msg_name = field_name
                    if msg_name.startswith("Cmd"):
                        msg_name = msg_name[3:]
                    detected[msg_name] = field_id
    return detected

def prune_proto(
    raw_proto_path: str,
    output_proto_path: str,
    packet_ids_path: str,
    required_types_path: str
):
    print(f"[*] Reading raw proto from: {raw_proto_path}")
    header_lines, entities = parse_proto(raw_proto_path)
    print(f"[*] Parsed {len(entities)} total entities ({sum(1 for e in entities.values() if e.kind == 'message')} messages, {sum(1 for e in entities.values() if e.kind == 'enum')} enums)")

    # Extract field dependencies
    extract_dependencies(entities)

    # Load Packet IDs
    cmd_id_map: Dict[str, int] = {}
    if os.path.exists(packet_ids_path):
        with open(packet_ids_path, 'r', encoding='utf-8') as f:
            cmd_id_map.update(json.load(f))
        print(f"[*] Loaded {len(cmd_id_map)} Packet IDs from {packet_ids_path}")

    # Also auto-detect from enums in raw proto if any
    auto_ids = auto_detect_cmd_ids_from_enums(entities)
    if auto_ids:
        new_count = 0
        for k, v in auto_ids.items():
            if k not in cmd_id_map:
                cmd_id_map[k] = v
                new_count += 1
        if new_count > 0:
            print(f"[*] Auto-detected {new_count} additional Packet IDs from proto enums")

    # Load Required Types
    required_types: Set[str] = set()
    if os.path.exists(required_types_path):
        with open(required_types_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list):
                required_types.update(data)
            elif isinstance(data, dict) and "types" in data:
                required_types.update(data["types"])
        print(f"[*] Loaded {len(required_types)} required types from {required_types_path}")

    # Root set = required_types + all messages having a CmdID
    root_set = set(required_types) | set(cmd_id_map.keys())

    # Keep only those roots that actually exist in the proto
    existing_roots = {name for name in root_set if name in entities}
    print(f"[*] Root entities to resolve: {len(existing_roots)}")

    # Tree-shaking: recursively collect all dependencies
    needed: Set[str] = set(existing_roots)
    queue: List[str] = list(existing_roots)

    while queue:
        curr = queue.pop(0)
        for dep in entities[curr].dependencies:
            if dep not in needed and dep in entities:
                needed.add(dep)
                queue.append(dep)

    msg_count = sum(1 for name in needed if entities[name].kind == 'message')
    enum_count = sum(1 for name in needed if entities[name].kind == 'enum')
    pruned_count = len(entities) - len(needed)
    saved_pct = (pruned_count / len(entities)) * 100 if entities else 0

    print(f"\n" + "="*50)
    print(f"[+] Tree-Shaking Summary:")
    print(f"    - Kept:   {len(needed)} entities ({msg_count} messages, {enum_count} enums)")
    print(f"    - Pruned: {pruned_count} unused entities ({saved_pct:.1f}% reduction)")
    print("="*50 + "\n")

    # Load Patches if any
    patches_path = os.path.join(os.path.dirname(output_proto_path), "patches.json")
    patches = {}
    if os.path.exists(patches_path):
        try:
            with open(patches_path, 'r', encoding='utf-8') as f:
                patches = json.load(f)
            print(f"[*] Loaded patches from {patches_path}")
        except Exception:
            pass

    # Ensure output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(output_proto_path)), exist_ok=True)

    # Write output proto
    with open(output_proto_path, 'w', encoding='utf-8') as f:
        f.write('syntax = "proto3";\n')
        f.write('// Auto-generated by Hoyo Proto Tree-Shaker\n')
        f.write(f'// Kept {len(needed)} entities from {len(entities)} raw entities\n\n')

        # Separate enums and messages: write enums first or alphabetical
        for name in sorted(needed):
            entity = entities[name]
            content = entity.raw_content

            # Apply patches if configured for this entity
            entity_category = "messages" if entity.kind == "message" else "enums"
            if entity_category in patches and name in patches[entity_category]:
                for old_val, new_val in patches[entity_category][name].items():
                    content = content.replace(old_val, new_val)

            if name in cmd_id_map:
                f.write(f"// CmdID: {cmd_id_map[name]}\n")
            f.write(content)
            if not content.endswith("\n"):
                f.write("\n")
            f.write("\n")

    print(f"[+] Output written to: {output_proto_path}")

    # Validate with protoc if available
    try:
        abs_out = os.path.abspath(output_proto_path)
        out_dir = os.path.dirname(abs_out)
        check = subprocess.run(
            ["protoc", f"--proto_path={out_dir}", "--descriptor_set_out=NUL", abs_out],
            capture_output=True,
            text=True
        )
        if check.returncode == 0:
            print("[+] Verification: protoc validated successfully with 0 errors!")
        else:
            print("[!] Warning: protoc reported issues:")
            print(check.stderr)
    except Exception:
        pass

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    default_raw = os.path.join(root_dir, "StarRail.proto")
    default_out = os.path.join(root_dir, "proto", "StarRail.proto")
    default_packet_ids = os.path.join(root_dir, "proto", "packet_ids.json")
    default_required_types = os.path.join(root_dir, "proto", "required_types.json")

    parser = argparse.ArgumentParser(description="Prune and tree-shake raw Star Rail proto")
    parser.add_argument("--raw", default=default_raw, help="Path to raw StarRail.proto")
    parser.add_argument("--out", default=default_out, help="Output path for pruned StarRail.proto")
    parser.add_argument("--packet-ids", default=default_packet_ids, help="Path to packet_ids.json")
    parser.add_argument("--required", default=default_required_types, help="Path to required_types.json")

    args = parser.parse_args()

    if not os.path.exists(args.raw):
        print(f"[!] Error: Raw proto not found at: {args.raw}", file=sys.stderr)
        sys.exit(1)

    prune_proto(args.raw, args.out, args.packet_ids, args.required)

if __name__ == "__main__":
    main()
