# Updating the proto from a raw dump

Run this in PowerShell:

```powershell
python D:\Github\Hoyo\proto\update_proto.py
```

By default, the tool reads:

- `StarRail.proto` for declaration order, existing translated names, and the
  server-compatible message/oneof layout
- `StarRail.obfuscated4.7.51.proto` for updated field and enum numbers

It creates:

- `StarRail.raw.updated.candidate.proto` — the updated candidate
- `StarRail.raw.update-report.txt` — counts and raw field/value differences

The candidate keeps exactly the declarations from `StarRail.proto`, in the
same order. Declarations found only in the raw file are ignored. For matching
declarations:

- Existing field and enum value names are retained when the raw name matches.
- When a name is obfuscated in the raw data, readable existing names are paired
  with remaining raw entries in their original order.
- Existing oneof grouping is retained. An unresolved raw field type falls back
  to the existing type when available, otherwise to `bytes`.
- New obfuscated enum values are qualified to avoid duplicate protobuf enum
  identifiers.

For example, `CCHMHOONEGG` is emitted with `OCJLBKDCKHL = 5` and `num = 13`.
The raw field name `FOJDEJPDKEJ` is not used to replace the existing translated
name `num`.

Order-based name pairing is necessarily a best-effort match: if fields were
reordered or changed meaning in the raw dump, the preserved name may not
describe the new field correctly. Review the candidate/report and test the
server before using a new dump. The current candidate was checked with
`protoc` and `cargo check --workspace` in an isolated workspace; generated Rust
files in the working tree were not modified.

`StarRail.proto` and the raw source are not overwritten by the updater. To
choose different inputs or outputs, use `--base`, `--source`, `--output`, and
`--report`.

## PowerShell backup updater

If the Python updater is unavailable or the raw dump is incomplete, use the
independent PowerShell updater with the translated 4.7.51 sample:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File D:\Github\Hoyo\proto\update_proto_backup.ps1
```

It replaces declarations shared with `StarRail4.7.51.proto`, retains
base-only declarations, restores the sample's `CmdID` comments, and includes
sample-only declarations only when another output declaration references them.
It writes `StarRail.backup.candidate.proto` and
`StarRail.backup.report.txt`; it does not overwrite `StarRail.proto` by default.
The candidate is checked with `protoc` when `protoc` is on `PATH`. If it is not,
pass its executable path with `-ProtocPath`.

To apply a validated candidate, add `-Apply`. The tool first saves the current
base as a timestamped `StarRail.before-backup-*.proto` file and requires
successful `protoc` validation before replacing `StarRail.proto`.
