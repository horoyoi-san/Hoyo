# March7thHoney

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-2ea44f" alt="Platform" />
  <img src="https://img.shields.io/badge/Status-Active%20Development-f39c12" alt="Status" />
  <img src="https://img.shields.io/badge/License-GPLv3-blue" alt="License" />
</p>

March7thHoney is a server project built with .NET 10.
The project is actively developed, with regular feature updates and fixes.

[EN](README.md) | [简中](docs/README_zh-CN.md) | [繁中](docs/README_zh-TW.md) | [JP](docs/README_ja-JP.md)

## Table of Contents

- [Feature Progress](#feature-progress)
- [Gameplay Implementation Tree](docs/GameplayImplementationTree.md)
- [Muip API Entry](#muip-api-entry)
- [Roadmap](#roadmap)
- [Repository Layout](#repository-layout)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Native Linux Server](#native-linux-server)
- [Build](#build)
- [CI Artifacts](#ci-artifacts)
- [Notes](#notes)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)

## Feature Progress

| Module | Status | Notes |
|---|---|---|
| Shop system | Stable | Browse and purchase flow works |
| Team formation | Stable | Lineup and slot switching available |
| Warp/Gacha | Stable | Full pull flow and result display |
| Battle flow | Stable | Core combat loop is playable |
| Open-world scene | Stable | Scene loading, interaction, exploration |
| Character progression | Stable | Leveling and promotion loops available |
| Quest system | In progress | Main/common progression works, edge cases remain |
| Friend system | Stable | Core interaction and display |
| Anomaly Arbitration | Stable | Entry/challenge/reward supported |
| Challenge modes | Stable | FH / PF / AS playable |
| Currency War | In progress | Basic gameplay flow available |
| Achievement system | Stable | Most achievements supported |

Detailed implementation progress: [Gameplay Implementation Tree](docs/GameplayImplementationTree.md) | [简中](docs/GameplayImplementationTree_zh-CN.md) | [繁中](docs/GameplayImplementationTree_zh-TW.md) | [JP](docs/GameplayImplementationTree_ja-JP.md)

## Muip API Entry

- Muip API docs: [English](docs/MuipAPI.md) | [简中](docs/MuipAPI_zh-CN.md) | [繁中](docs/MuipAPI_zh-TW.md) | [日本語](docs/MuipAPI_ja-JP.md)


## Roadmap

1. Improve Currency War and Divergent Universe.
2. Fill remaining quests and special trigger logic.
3. Improve settlement/sync stability in edge cases.
4. Expand event-mode gameplay coverage.
5. Continue fixing UI and state-sync issues.
6. Add more configurable server options.

## Repository Layout

- `Program/` startup entry and orchestration
- `GameServer/` gameplay logic, packet handlers, runtime managers
- `WebServer/` dispatch/http side services
- `Command/` command implementations
- `Common/` shared data models, config, enums, and database entities
- `Config/` runtime resources and custom data
- `docs/` multilingual docs and API docs

## Requirements

- .NET SDK 10
- Git
- Windows, Linux, or macOS (`x64` / `arm64`)

## Quick Start

```bash
git clone --recurse-submodules https://github.com/Mar7thLover/March7thHoney.git
cd March7thHoney
dotnet restore
dotnet run --project Program/Program.csproj
```

## Native Linux Server

On Linux you can run from source the same way as Windows. The project path is
case-sensitive on Linux, so use `Program`, not `program`:

```bash
dotnet run --project Program/Program.csproj
```

Or use the root launcher:

```bash
bash Start.sh
```

On a fresh Debian server, install prerequisites once:

```bash
bash scripts/setup-debian.sh
```

To update later:

```bash
git pull --ff-only
git submodule update --init --recursive
dotnet run --project Program/Program.csproj
```

Optional systemd service setup:

```bash
sudo bash scripts/install-systemd-service.sh
sudo systemctl start march7thhoney
```

More details: [Native Linux Setup](docs/native-linux.md).

## Build

```bash
dotnet build Program/Program.csproj -c Release
```

## CI Artifacts

Workflow publishes self-contained builds for:

| Runtime | Artifact Name |
|---|---|
| `win-x64` | `March7thHoney-win-x64` |
| `linux-x64` | `March7thHoney-linux-x64` |
| `linux-arm64` | `March7thHoney-linux-arm64` |

## Notes

- If behavior looks inconsistent after updating commits, clear runtime cache/data and retest with a fresh account state first.
- Some modules are still under refactor, so packet behavior may change before docs fully catch up.

## Troubleshooting

- Check server logs under your configured log path.
- `/scene reload` can solve most of the problem.
- Community support: <https://discord.gg/CyreneEchoes>

## Credits

### Collaborators

- [Mar7thLover](https://github.com/Mar7thLover)
- [Cyrup](https://github.com/March7thHoney)
- [Melioli](https://github.com/Melioli)

### Contributors

- [Yuki](https://github.com/Yuki8859)
- [Cyt](https://github.com/qinfyy)

### Projects

- [LunarCore](https://github.com/Melledy/LunarCore)
- [DanhengServer](https://github.com/Mar7thLover/DanhengServer-OpenSource)
