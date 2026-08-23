# AstralOS

<div align="center">

![Rust](https://img.shields.io/badge/Rust-2024_Edition-orange?logo=rust)
![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?logo=tauri)
![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-Windows_x64-blue?logo=windows)

**An all-in-one, production-grade reverse engineering toolkit, local server emulator (RobinSR), IL2CPP metadata decryptor, and Protobuf de-obfuscation suite for Honkai: Star Rail on Windows.**

</div>

---

> [!WARNING]
> **Educational & Academic Research Disclaimer**  
> This project is designed strictly for research, academic reverse-engineering, and protocol analysis purposes. It is not affiliated with, endorsed by, or representative of miHoYo, HoYoverse, or Cognosphere. Anti-cheat bypasses and commercial game cracks are explicitly **not** included. Use at your own discretion and risk.

---

## 🌟 Key Features & Toolchain

### 1. 🦀 Morax Pure-Rust Metadata & Proto Engine (`crates/morax`)
- **Zero Python Dependency**: 100% native Rust implementation compiled directly into the binary.
- **Offline Static Parser**: Decodes obfuscated metadata from `GameAssembly.dll` and `global-metadata.dat` without running the game client.
- **Native x86_64 Disassembly (`iced-x86`)**: Analyzes PE sections and decodes `WriteTo` method bytecodes to recover Protobuf field wire tags and memory layouts.
- **Dynamic De-obfuscation**: Resolves obfuscated 11-letter class tokens (e.g. `CLCOAJDPMJN`) to clean network packet names (`PlayerGetTokenCsReq`) by matching handler patterns (`Send...CsReq`, `Handle...ScRsp`, `On...ScNotify`).
- **Comprehensive Artifact Generation**:
  - `StarRail.proto` (511 Messages, 52 Core Enums, 150 CmdIDs)
  - `packetIds.json` (150 mapped CmdID opcodes)
  - `dump.cs` (IL2CPP C# Type Definitions)
  - `il2cpp.h` (C++ structures for IDA Pro and Ghidra)
  - `DummyDlls/Assembly-CSharp.dll` (Mock assembly for dnSpy and ILSpy)

### 2. 🎮 Live In-Game Memory Dumper (`crates/dumper`)
- **In-Process Runtime Hook**: Injected via `version.dll` when launching official live game clients.
- **Memory Scanning**: Extracts runtime type handles, response notification maps, and active packet structures directly from memory over local IPC (`localhost:42857`).

### 3. 🌐 RobinSR Local Server Emulator (`crates/robinsr`)
- **Dual Gateway Architecture**:
  - HTTP Dispatch Server (`:21000`)
  - KCP Gameserver (`:23301`)
- **Real-time Logging & Diagnostics**: Integrated log stream with filterable level views.
- **State Reset Tools**: 1-click player position reset and state recovery.

### 4. 📡 Network Sniffer & Packet Analyzer (`crates/sniffer`)
- Real-time packet capture and decoding.
- Hex view, protocol field inspection, and opcode mapping.

### 5. ⚡ Resource Compiler Engine (`crates/morax`)
- **Multi-threaded Indexer**: Scans 30,000+ extracted raw scene/level and Excel JSON files using Rayon parallel iterators.
- **Fast Res Compilation**: Aggregates maps, monster spawn coordinates, waypoints, and avatar configs into a unified, high-performance `res.json` (< 1.0s) for RobinSR server.

### 6. 🔄 Game Patcher & Differential Patch Engine (`crates/utils`)
- **HDiff Patching**: Applies binary differential updates directly to game client asset bundles and executables.
- **Dry-run Validation**: Verifies checksums and patch compatibility before modifying files.

### 7. 🌐 Game Language Patcher (`crates/utils`)
- **Language Switcher**: Dynamically configures in-game audio and text localization without requiring full game restarts.
- **Format Support**: Supports English, Japanese, Traditional/Simplified Chinese, Korean, Thai, and more.

### 8. 🖥️ Modern Desktop GUI (`web/` + `src-tauri/`)
- Built with **Tauri 2.0 + React 19 + TypeScript + Tailwind CSS v4 + Lucide Icons**.
- Multi-tab workflow categorized logically into:
  - **Reverse Engineering**: Morax Cracker, IL2CPP Dumper, Resource Compiler, Packet Sniffer, Asset Studio.
  - **Game Modifiers**: Game Patcher, Language Patcher, Game Tweaks, XLua Console, Quest Editor.
  - **Server & Runtime**: RobinSR Server.
  - **Player Analytics**: Warp Tracker, Relic Scorer.
  - **System & Docs**: AI Agent, Telemetry Logs, Settings.

---

## 📁 Repository Architecture

```text
AstralOS/
├── Cargo.toml                  # Cargo Workspace root (Rust 2024 edition)
├── .gitignore                  # Production gitignore rules
├── README.md                   # Project documentation
├── menu.bat                    # 1-Click Master Control Batch Center
├── res.json                    # Star Rail Excel & game resource database
├── freesr-data.json            # Initial player & avatar database
├── versions.json               # Gateway dispatch & version routing config
│
├── crates/                     # Core Rust Crates
│   ├── morax/                  # Pure-Rust IL2CPP metadata parser & Proto dumper
│   │   ├── src/proto.rs        # Native iced-x86 Proto de-obfuscation engine
│   │   ├── src/pe.rs           # PE header & section reader
│   │   ├── src/metadata.rs     # IL2CPP global-metadata parser
│   │   └── src/dump.rs         # dump.cs C# type builder
│   ├── dumper/                 # In-game RAM hook dumper (version.dll)
│   ├── robinsr/                # RobinSR server emulator orchestration
│   ├── robinsr_engine/         # Core server protocol, proto schemas & dispatch
│   ├── sniffer/                # Network packet sniffer & parser
│   ├── cheat/                  # In-game cheat & modding features
│   ├── design/                 # Visual and UI layout engine
│   ├── gacha/                  # Chromium cache gacha history reader
│   ├── il2cpp/                 # IL2CPP runtime reflection & function hooks
│   ├── ipc/                    # Local IPC client & server bridge
│   ├── mcp-server/             # MCP bridge for IDA Pro & AI agents
│   ├── reflection/             # C# reflection & struct interop
│   ├── unpacker/               # Asset & texture unpacker (OpenCL accelerated)
│   └── utils/                  # Shared utilities & cryptography helpers
│
├── src-tauri/                  # Tauri 2.0 Desktop Backend
│   ├── Cargo.toml              # Tauri dependencies (hsr-desktop)
│   └── src/main.rs             # Tauri command handlers & server manager
│
├── web/                        # Modern React 19 Frontend Dashboard
│   ├── package.json            # Web dependencies (Vite + React + Tailwind v4)
│   ├── src/
│   │   ├── components/         # Modular UI views (morax, dumper, robinsr, etc.)
│   │   ├── stores/             # Zustand state management
│   │   └── lib/                # Tauri API bridge & utilities
│   └── dist/                   # Production build output
│
├── DUMP/                       # Categorized Reverse Engineering Outputs
│   ├── Morax_Static/           # Morax Cracker Offline Parser (StarRail.proto, packetIds.json, dump.cs, methods.json, il2cpp.h, DummyDlls/)
│   └── IL2CPP_Dumper/          # IL2CPP Live Memory Hook (StarRail.proto, packetIds.json, dump.cs, data.json, mod.rs, excel_paths.json)
└── bin/                        # Standalone distribution runtime binaries and configs
    ├── AstralOS.exe            # 1-Click Standalone Desktop Suite
    ├── version.dll             # In-game Dumper & Interceptor Hook
    ├── sdkserver.exe           # HTTP Dispatch Server
    ├── gameserver.exe          # KCP Game Server
    ├── res.json                # Compiled Game Resources Database
    ├── freesr-data.json        # Player & Avatar Archetypes
    └── versions.json           # Dispatch & Version Route Config
```

---

## 🛠️ System Requirements & Prerequisites

Before building or running AstralOS, make sure you have installed all mandatory dependencies below. Missing any of these will prevent compilation or cause runtime crashes.

### 📋 Mandatory Software Checklist

| Tool / Runtime | Minimum Version | Purpose | Download Link |
| :--- | :--- | :--- | :--- |
| **Windows OS** | Windows 10/11 (64-bit) | Target operating system for gameserver & hook DLL | Built-in |
| **Visual Studio C++ Build Tools** | VS 2022 (v143) | **CRITICAL:** Provides `link.exe`, MSVC toolchain & Windows SDK for Rust compilation | [Download VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) |
| **Rust & Cargo** | 1.80+ (Stable / Nightly) | Compiles the backend crates (`morax`, `robinsr`, `dumper`, `sniffer`) | [Download rustup.rs](https://rustup.rs/) |
| **Node.js & npm** | Node.js v18+ (v20+ LTS recommended) | Builds the React 19 / Tailwind v4 frontend interface | [Download Node.js](https://nodejs.org/) |
| **WebView2 Runtime** | Evergreen (Latest) | Required by Tauri 2.0 to render the desktop GUI window | [Download WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) |
| **Git for Windows** | 2.40+ | Repository cloning and source management | [Download Git](https://git-scm.com/) |

---

### ⚠️ Critical Installation Details

> [!IMPORTANT]
> **1. Visual Studio C++ Build Tools Setup**  
> When running the Visual Studio Installer, you **MUST** check the box for:
> - ✅ **Desktop development with C++**
> - ✅ **MSVC v143 - VS 2022 C++ x64/x86 build tools**
> - ✅ **Windows 10/11 SDK (latest)**  
> *(If omitted, Rust will fail with `error: linker link.exe not found`).*

> [!IMPORTANT]
> **2. Rust MSVC Target Selection**  
> When running `rustup-init.exe`, select the default option:
> - `1) Proceed with installation (default)` (targeting `x86_64-pc-windows-msvc`).

---

### 🔍 Verify Your Environment

Open PowerShell and verify that all tools are registered in your system `PATH`:

```powershell
rustc --version       # Should output: rustc 1.8x+ ...
cargo --version       # Should output: cargo 1.8x+ ...
node -v               # Should output: v18.x.x or v20.x.x+
npm -v                # Should output: 9.x.x or 10.x.x+
git --version         # Should output: git version 2.x ...
```

---

## 🚀 Getting Started & Building

### Step 1: Clone the Repository
```powershell
git clone https://github.com/Ma3-OS/AstralOS.git
cd AstralOS
```

---

### Step 2: 1-Click Master Control (`menu.bat`)
The fastest way to manage, build, and run the entire environment is via the included batch control center:
```powershell
.\menu.bat
```
- **Option `[1]`**: 1-Click Launch All (Starts RobinSR Server + Auto-Deploys Hook + Opens Desktop GUI)
- **Option `[2]`**: Launch Game Client (Auto-deploys and locks `version.dll` Read-Only)
- **Option `[3]`**: Auto-Fix and Protect `version.dll`
- **Option `[4]`**: Start RobinSR Server (:21000 Dispatch + :23301 Gameserver)
- **Option `[5]`**: Launch Desktop App (`AstralOS.exe`)
- **Option `[7]`**: Run Morax Proto Dumper (Generates `StarRail.proto` & `packetIds.json` in 0.1s)
- **Option `[10]`**: Modular Build System (Build Frontend, Server Engine, Dumper DLL, Morax, or Standalone `.exe`)

---

### Step 3: Standalone Single-File Release (`AstralOS.exe`)
AstralOS features an **Embedded Auto-Extractor**:
- The standalone executable `AstralOS.exe` embeds all essential runtime dependencies (`version.dll`, `sdkserver.exe`, `gameserver.exe`, and `res.json`).
- When running `AstralOS.exe` on a fresh system, it automatically validates and deploys missing runtime binaries within 0.05 seconds with zero setup required.

---

### Step 3: Manual Step-by-Step Build (Alternative)

#### 1. Build Rust Backend & Dumper Hook DLL:
```powershell
# Build all workspace crates in release mode
cargo build --release

# Build in-game memory hook DLL (version.dll)
cargo build --release -p dumper
```

#### 2. Install Web Dependencies & Build Frontend:
```powershell
cd web
npm install
npm run build
cd ..
```

#### 3. Launch Desktop GUI in Dev Mode:
```powershell
cd web
npm run tauri dev
```

#### 4. Build Standalone Desktop Executable (`.exe`):
```powershell
cd web
npm run tauri build
```
The compiled release executable and installer will be located at:
- **Executable**: `src-tauri\target\release\hsr-desktop.exe`
- **Installer**: `src-tauri\target\release\bundle\nsis\*.exe`

---

## ❓ Troubleshooting & Common Errors

<details>
<summary><b>1. <code>error: linker link.exe not found</code></b></summary>

**Cause:** Microsoft C++ Build Tools are missing or not installed with the Windows SDK.  
**Fix:** Install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and make sure **Desktop development with C++** and **Windows 10/11 SDK** are selected. Restart your terminal after installing.
</details>

<details>
<summary><b>2. <code>'npm' is not recognized as an internal or external command</code></b></summary>

**Cause:** Node.js is not installed or not added to your system `PATH`.  
**Fix:** Install [Node.js (LTS)](https://nodejs.org/) and ensure "Add to PATH" is checked during setup.
</details>

<details>
<summary><b>3. Blank window appears when starting Desktop App</b></summary>

**Cause:** Microsoft Edge WebView2 runtime is missing or corrupted.  
**Fix:** Download and run the [Evergreen WebView2 Bootstrapper](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) from Microsoft.
</details>

<details>
<summary><b>4. <code>version.dll</code> is renamed or ignored by the official game launcher</b></summary>

**Cause:** The game launcher detected a modified writable DLL in the game root folder.  
**Fix:** Run `menu.bat` option `[3]` or `[2]`. AstralOS automatically restores the file and locks it with **Read-Only (`attrib +r`)** attributes to prevent launcher renaming.
</details>

<details>
<summary><b>5. Port 21000 or 23301 is already in use</b></summary>

**Cause:** A previous instance of `sdkserver.exe` or `gameserver.exe` is still running in the background.  
**Fix:** Run `menu.bat` option `[8]` (Stop All Local Servers) to cleanly terminate orphaned processes.
</details>

---

## 🛠️ Usage Guide

### ⚡ Mode 1: Beta & Offline Static Proto Dump (100% Autonomous)
1. Open the **AstralOS Desktop Dashboard**.
2. Navigate to **Morax / RE Toolchain** in the sidebar.
3. Select your Star Rail game folder (or browse directly to `GameAssembly.dll` and `global-metadata.dat`).
4. Click **`🚀 1-Click All-in-One Dump`**:
   - The native Rust engine will scan and de-obfuscate all packet handlers in under **0.20 seconds**.
   - Outputs are saved directly to `./DUMP/` (`StarRail.proto`, `packetIds.json`, `dump.cs`, `il2cpp.h`).

---

### 🎮 Mode 2: Live In-Game Memory Dump
1. Navigate to **Dumper View** in the sidebar.
2. Ensure the official game client is running with `version.dll` injected.
3. Click **Run Dumper** to extract live memory types and notification routes via port `42857`.

---

### 🌐 Mode 3: Running RobinSR Local Server
1. Navigate to **RobinSR View** in the sidebar.
2. Click **Start Server**:
   - HTTP Dispatch Gateway starts on `http://127.0.0.1:21000`
   - KCP Gameserver starts on `0.0.0.0:23301`
3. Check the real-time tabbed console for network packets and dispatch activity.

---

## 👥 Credits & References

- [texture2ddecoder](https://github.com/UniversalGameExtraction/texture2ddecoder) — Block-compressed texture decoding algorithms.
- [HoYo.Gacha](https://github.com/lgou2w/HoYo.Gacha) — Chromium disk-cache gacha record reader reference.
- [iced-x86](https://github.com/icedland/iced) — High-performance x86/x64 instruction decoder in Rust.
- Oodle (`oo2core_win64.lib`) — Asset decompression library (© Epic Games / RAD Game Tools).

---

## 📄 License

This project is open-sourced under the [MIT License](LICENSE).

