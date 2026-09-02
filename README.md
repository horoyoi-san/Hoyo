# AstralOS

<div align="center">

![Rust](https://img.shields.io/badge/Rust-2024_Edition-orange?logo=rust)
![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?logo=tauri)
![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-Windows_x64-blue?logo=windows)

**AstralOS is an all-in-one, production-grade local server emulator (RobinSR), reverse engineering toolkit, in-game language patcher, delta patch applier with snapshot rollback, and IL2CPP metadata/Protobuf de-obfuscation suite for Honkai: Star Rail on Windows.**

[English](#-english-documentation) • [คู่มือภาษาไทย (Thai Guide)](#-คู่มือการติดตั้งและใช้งาน-ภาษาไทย) • [Downloads & Prerequisites](#-system-requirements--prerequisites) • [Features](#-core-features--toolchain) • [In-Game Commands](#-in-game-chat-commands-reference) • [Troubleshooting](#-troubleshooting--faq) • [Credits & Acknowledgments](#-credits--acknowledgments)

</div>

---

> [!WARNING]
> **Educational & Academic Research Disclaimer**  
> This project is designed strictly for research, academic reverse-engineering, and protocol analysis purposes. It is not affiliated with, endorsed by, or representative of miHoYo, HoYoverse, or Cognosphere. Commercial game cracks and malicious exploits are explicitly **not** included. Use at your own discretion and risk.

---

## 📖 Table of Contents

- [System Requirements & Prerequisites](#-system-requirements--prerequisites)
- [Quick Start: Prebuilt Release](#-quick-start-using-prebuilt-release)
- [Developer Guide: Build from Source](#-developer-guide-building-from-source)
- [Core Features & Toolchain](#-core-features--toolchain)
- [In-Game Chat Commands Reference](#-in-game-chat-commands-reference)
- [Repository Architecture](#-repository-architecture)
- [Master Control Script (`menu.bat`) Index](#-master-control-script-menubat-index)
- [คู่มือการติดตั้งและใช้งาน (ภาษาไทย)](#-คู่มือการติดตั้งและใช้งาน-ภาษาไทย)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [Credits & Acknowledgments](#-credits--acknowledgments)
- [License](#-license)

---

# 🇺🇸 English Documentation

## 🛠️ System Requirements & Prerequisites

Before installing or building AstralOS, make sure your environment has the following software installed.

### 📋 Mandatory Software Checklist

| Software / Runtime | Minimum Version | Purpose | Official Download Link |
| :--- | :--- | :--- | :--- |
| **Windows OS** | Windows 10 / 11 (64-bit) | Target operating system | Built-in |
| **Visual Studio C++ Build Tools** | VS 2022 (v143) | **CRITICAL:** MSVC compiler, `link.exe`, and Windows SDK for compiling native Rust crates | [Download VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) |
| **Rust & Cargo** | 1.80+ (Stable) | Compiles `robinsr_engine`, `morax`, `utils`, `dumper`, and `hsr-desktop` | [Download rustup.rs](https://rustup.rs/) |
| **Node.js & npm** | Node.js v20+ LTS | Builds the React 19 / Tailwind CSS v4 frontend interface | [Download Node.js](https://nodejs.org/) |
| **Microsoft Edge WebView2** | Evergreen (Latest) | Desktop GUI rendering engine for Tauri 2.0 | [Download WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) |
| **Git for Windows** | 2.40+ | Repository cloning and submodule management | [Download Git](https://git-scm.com/) |

### ⚠️ Critical Installation Details

> [!IMPORTANT]
> **1. Visual Studio C++ Build Tools Setup**  
> When running the Visual Studio Installer, you **MUST** select the following workload:
> - ✅ **Desktop development with C++**
> - ✅ **MSVC v143 - VS 2022 C++ x64/x86 build tools (Latest)**
> - ✅ **Windows 10/11 SDK (Latest version)**  
> *(Without this, Cargo will fail with `error: linker link.exe not found`).*

> [!IMPORTANT]
> **2. Rust MSVC Toolchain**  
> During `rustup-init.exe` setup, select option `1) Proceed with installation (default)` (targeting `x86_64-pc-windows-msvc`).

---

## ⚡ Quick Start: Using Prebuilt Release

For players and general users who want to run the server without compiling code:

1. Go to the **[Releases](https://github.com/Ma3-OS/AstralOS/releases)** page on GitHub.
2. Download the latest `AstralOS-Windows-x64.zip`.
3. Extract the ZIP archive into a clean directory (e.g. `C:\AstralOS` or `D:\AstralOS`).
4. Ensure your game folder contains `StarRail.exe`.
5. Launch **`AstralOS.exe`** (or run `menu.bat`):
   - **Step 1:** Go to **Settings** and select your **Star Rail Game Directory**.
   - **Step 2:** Go to **Game Patcher** and click **Deploy & Lock DLL** (this installs and protects `version.dll` in your game folder).
   - **Step 3:** Go to **RobinSR View** and click **Start Server** (HTTP Gateway `:21000` and KCP Gameserver `:23301` will start).
   - **Step 4:** Click **Launch Game** to start playing on your local private server!

---

## 🏗️ Developer Guide: Building from Source

### Step 1: Clone the Repository
```powershell
git clone https://github.com/Ma3-OS/AstralOS.git
cd AstralOS
```

### Step 2: Automated 1-Click Build via `menu.bat`
Run `menu.bat` and select Option `[13]` (Modular Build System) -> Option `[1]` (Build All-in-One Distribution):
```powershell
.\menu.bat
```

### Step 3: Manual Step-by-Step Build

#### 1. Compile the Rust Backend & Hook DLL:
```powershell
# Compile all workspace crates (Release Mode)
cargo build --release

# Compile in-game memory hook DLL (version.dll) with path sanitization
$env:RUSTFLAGS = "--remap-path-prefix=$env:USERPROFILE=/user --remap-path-prefix=$((Get-Location).Path)=/astralos"
cargo build --release -p dumper
Copy-Item target/release/version.dll bin/version.dll -Force
```

#### 2. Install Web Dependencies & Build Frontend:
```powershell
cd web
npm install
npm run build
cd ..
```

#### 3. Compile Standalone Desktop Application (Tauri 2.0):
```powershell
cd web
npx tauri build --no-bundle
cd ..
Copy-Item src-tauri/target/release/hsr-desktop.exe bin/AstralOS.exe -Force
```

---

## 🌟 Core Features & Toolchain

### 1. 🌐 RobinSR Local Server Emulator (`crates/robinsr_engine`)
- **High-Performance Architecture:** Pure asynchronous Rust running on Tokio and Axum.
- **Dual Gateway System:**
  - **HTTP Dispatch Server:** Listens on `http://127.0.0.1:21000` with automated version routing and hotfix asset resolution (`/query_dispatch`, `/query_gateway`).
  - **KCP UDP Gameserver:** Listens on `0.0.0.0:23301` with packet framing and state synchronization.
- **Auto Port Conflict Resolver:** Automatically detects and frees ports `21000` (TCP) and `23301` (UDP) from ghost processes before startup.
- **Dynamic Hotfix Resolver:** Automatically queries official CDN routes for any connected game client version (BETA / PROD / OS / CN) and caches metadata in `bin/versions.json`.
- **Preconfigured Archetypes:** Includes full avatar, relic, and inventory data (`freesr-data.json`).

### 2. 🗣️ Native In-Game Language Patcher with 1-Click Rollback (`crates/utils`)
- **Direct DesignData Binary Engine:** Directly patches `AllowedLanguageTable` inside `DesignData/*.bytes` without external tools.
- **In-Game Text Language Unlock:** Injects all 13 supported text languages into `language_list` (`en`, `th`, `ja`, `cn`, `cht`, `ko`, `es`, `fr`, `de`, `ru`, `pt`, `id`, `vi`) with automatic capacity packing.
- **Auto Snapshot & 1-Click Rollback:** Automatically creates timestamped backups in `.astralos_backup/` before patching, allowing instant 1-click restoration.
- **3-Layer Synchronization:** Synchronizes DesignData binary bytes, Windows Registry keys (`LanguageSettings_LocalTextLanguage`), and `GeneralConfig.json`.

### 3. 🛡️ Game Patcher, DLL Protector & HDiff Rollback (`crates/utils`)
- **Delta Patch Applier:** Applies differential game updates (`.hdiff`, `.patch`, `.zip`) with automated snapshot backup and 1-click binary rollback.
- **Hook Lock Protection:** Automatically deploys `version.dll` into the game directory and locks it with Read-Only attributes (`attrib +r`) to prevent the official launcher from renaming or deleting it.
- **Direct Game Launching:** Launches `StarRail.exe` directly with active proxy hook to bypass official launcher crashes and flashing windows.

### 4. 🔮 Morax Reverse Engineering & Proto Suite (`crates/morax`)
- **100% Offline Static Decoder:** Extracts classes, methods, and RVAs from `GameAssembly.dll` and `global-metadata.dat` in under 0.3s.
- **Native iced-x86 Disassembler:** Disassembles `WriteTo` bytecodes to reconstruct field tags, types, and wire formats.
- **Automated Artifact Generation:**
  - `StarRail.proto` (Complete Messages, Enums, and mapped CmdID opcodes)
  - `packetIds.json` (Mapped CmdID opcodes table)
  - `dump.cs` (C# type definitions for ILSpy/dnSpy)
  - `methods.json` (Method signatures and RVA addresses)
  - `il2cpp.h` (C++ structures for IDA Pro and Ghidra)
  - `DummyDlls/Assembly-CSharp.dll` (Mock assembly for reflection)

### 5. ⚡ Automated Resource Compiler (`crates/morax`)
- **Parallel Rayon Pipeline:** Parses thousands of raw `Config/LevelOutput` scene files and `ExcelOutput` tables in under 1 second.
- **Compact res.json Generator:** Generates a lightweight, minified `res.json` (~12.8 MB, 67% reduction) for ultra-fast RobinSR world loading.

### 6. 📡 Packet Sniffer & Decryptor (`crates/sniffer`)
- Live KCP packet sniffer with real-time opcode decoding, hex dumps, and payload analysis.

### 7. 🎮 Game Tweaks & XLua Runner (`crates/cheat`)
- Unlocks FPS limits (120/144/240 FPS), custom FOV, camera distance adjustments, and in-game XLua script execution.

---

## 💬 In-Game Chat Commands Reference

Send messages in the in-game chat to the **Server (UID 727 / RobinSR)** to execute commands:

| Command | Arguments | Description | Example |
| :--- | :--- | :--- | :--- |
| **`sync`** | *(none)* | Synchronizes inventory, stats, and relics between `persistent` and live game view | `sync` |
| **`mc`** / **`tb`** | `<path / id>` | Switches Trailblazer path (`destruction`, `preservation`, `harmony`, `remembrance`) | `mc harmony` or `mc 8003` |
| **`march`** / **`m7`** | `<path / id>` | Switches March 7th path (`preservation`, `hunt`) | `march hunt` or `march 1224` |
| **`sw`** | `on` / `off` | Toggles Silver Wolf global team damage & resistance debuff | `sw on` |
| **`castorice`** | `on` / `off` | Toggles Castorice global buff | `castorice on` |
| **`cl`** | `clear` | Clears all current chat messages from the window | `cl clear` |
| **`lua`** | `<script_path>` | Executes an external Lua script in the live client | `lua script.lua` |

---

## 📁 Repository Architecture

```text
AstralOS/
├── Cargo.toml                  # Workspace configuration (Rust 2024 Edition)
├── .gitignore                  # Git ignore rules
├── README.md                   # Project documentation
├── menu.bat                    # Master Control Center script
├── Icon.png                    # Application logo asset
│
├── bin/                        # Centralized binaries and runtime data
│   ├── AstralOS.exe            # Desktop GUI Suite (Tauri release)
│   ├── version.dll             # In-game Dumper Hook DLL
│   ├── sdkserver.exe           # HTTP Dispatch Server executable
│   ├── gameserver.exe          # KCP Gameserver executable
│   ├── versions.json           # Version route & hotfix CDN table
│   └── res.json                # Compiled world & scene database
│
├── crates/                     # Core Rust Crates
│   ├── robinsr_engine/         # Core server protocol, proto schemas & dispatch
│   │   ├── common/             # Shared resources, archetypes, and configs
│   │   ├── gameserver/         # KCP Gameserver handlers (avatar, battle, chat, scene)
│   │   ├── sdkserver/          # HTTP Gateway & version dispatch routes
│   │   └── proto/              # Protobuf definitions & generated Rust types
│   ├── morax/                  # IL2CPP Metadata parser & iced-x86 Proto de-obfuscator
│   ├── utils/                  # In-game Language Patcher & HDiff Delta Patcher
│   ├── dumper/                 # In-game RAM hook & IPC dumper (version.dll)
│   ├── sniffer/                # Packet capture and MITM analysis engine
│   └── cheat/                  # In-game tweaks (FPS, FOV, Camera)
│
├── src-tauri/                  # Tauri 2.0 Desktop Backend
│   ├── src/main.rs             # Tauri commands, process manager, and native IPC
│   ├── icons/                  # Complete desktop application icon set
│   └── tauri.conf.json         # Desktop window and capability configuration
│
├── web/                        # React 19 + TypeScript + Tailwind CSS v4 Frontend
│   ├── src/
│   │   ├── components/         # Modular views (RobinSR, Patcher, Morax, Dumper, etc.)
│   │   ├── stores/             # Zustand state management stores
│   │   └── lib/                # Tauri IPC client, file pickers, and i18n
│   └── public/                 # Static web assets & favicon
│
└── DUMP/                       # Output directory for dumps and extracted files
```

---

## 🎛️ Master Control Script (`menu.bat`) Index

Launch `menu.bat` in the project root for interactive terminal control:

- **`[1] 1-Click Launch All`**: Starts RobinSR Server, auto-deploys `version.dll`, and opens the Desktop GUI.
- **`[2] Launch Game Client`**: Verifies and deploys `version.dll` (+R locked) and launches `StarRail.exe` directly.
- **`[3] Auto-Fix and Protect version.dll`**: Restores `version.dll` and locks it against launcher tampering.
- **`[4] Start RobinSR Server`**: Starts HTTP Gateway (`:21000`) and KCP Gameserver (`:23301`).
- **`[5] Launch Desktop App (AstralOS.exe)`**: Opens the modern desktop interface.
- **`[6] Start Web Dashboard`**: Starts the Vite development web dashboard.
- **`[7] Stop All Local Servers`**: Cleanly kills running `sdkserver.exe`, `gameserver.exe`, and clears occupied ports.
- **`[8] Run Morax Proto Dumper`**: Runs offline extraction to generate `StarRail.proto`, `dump.cs`, and `packetIds.json`.
- **`[9] Generate res.json Compiler`**: Runs high-speed `res_compiler` on raw resource folders.
- **`[10] In-Game Language Patcher`**: Interactive language switcher with automated snapshot and rollback.
- **`[11] Game Client Patch Updater (HDiff)`**: Applies `.hdiff` delta patches with snapshot backup and rollback.
- **`[12] Reset Player Position`**: Resets stuck characters to safe map coordinates.
- **`[13] Modular Build System`**: Build all crates, frontend, hook DLL, or standalone package.
- **`[14] Clean Artifacts and Cache`**: Quick or deep cleanup for `target/`, `dist/`, and `node_modules/`.
- **`[15] Open Project Folders`**: Opens `bin/`, `DUMP/`, `Resources/`, or project root in Windows Explorer.
- **`[16] Check Environment & Compiler Tools`**: Verifies VS Build Tools, Rust, Node.js, and WebView2.

---

# 🇹🇭 คู่มือการติดตั้งและใช้งาน (ภาษาไทย)

## 📌 สิ่งที่ต้องเตรียมและดาวน์โหลดก่อนติดตั้ง (Prerequisites)

| โปรแกรมที่ต้องลง | เวอร์ชันที่แนะนำ | หน้าที่การทำงาน | ลิงก์ดาวน์โหลด |
| :--- | :--- | :--- | :--- |
| **Visual Studio Build Tools** | VS 2022 (v143) | **จำเป็นที่สุด:** ติดตั้ง Compiler C++, `link.exe` และ Windows 10/11 SDK | [ดาวน์โหลด VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) |
| **Rust & Cargo** | 1.80 ขึ้นไป | คอมไพล์โปรแกรมส่วน Backend ของเซิร์ฟเวอร์และเครื่องมือทั้งหมด | [ดาวน์โหลด Rustup](https://rustup.rs/) |
| **Node.js** | v20 LTS ขึ้นไป | คอมไพล์หน้าต่าง UI (React 19 + Tailwind CSS) | [ดาวน์โหลด Node.js](https://nodejs.org/) |
| **Microsoft Edge WebView2** | Evergreen Runtime | เอนจินสำหรับเรนเดอร์หน้าต่าง Desktop GUI ของ Tauri | [ดาวน์โหลด WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) |
| **Git for Windows** | 2.40 ขึ้นไป | โคลนโค้ดและจัดการไฟล์โปรเจกต์ | [ดาวน์โหลด Git](https://git-scm.com/) |

> [!IMPORTANT]
> **ข้อควรระวังในการติดตั้ง Visual Studio Build Tools:**  
> ตอนติดตั้งให้ติ๊กเลือกหัวข้อ **"Desktop development with C++"** และตรวจดูว่ามี **MSVC v143** กับ **Windows 10/11 SDK** ติ๊กอยู่ด้วยเสมอ หากไม่ลงส่วนนี้ Rust จะไม่สามารถคอมไพล์โปรแกรมได้

---

## 🎮 วิธีติดตั้งและเข้าเล่นเกม (สำหรับผู้ใช้งานทั่วไป)

1. ไปที่เมนู **[Releases](https://github.com/Ma3-OS/AstralOS/releases)** แล้วดาวน์โหลดไฟล์ `AstralOS-Windows-x64.zip`
2. แตกไฟล์ ZIP ไว้ในโฟลเดอร์ที่ต้องการ (เช่น `C:\AstralOS` หรือ `D:\AstralOS`)
3. ดับเบิลคลิกเปิดไฟล์ **`AstralOS.exe`** (หรือเปิดผ่าน `menu.bat`)
4. **ตั้งค่าโฟลเดอร์เกม:** ไปที่เมนู **Settings** แล้วเลือกโฟลเดอร์ที่ติดตั้งเกม Star Rail
5. **ติดตั้ง Hook DLL:** ไปที่เมนู **Game Patcher** แล้วกดปุ่ม **"ติดตั้ง & ล็อก DLL"** (ระบบจะนำไฟล์ `version.dll` ไปใส่ในโฟลเดอร์เกมและล็อกแบบ Read-Only ป้องกันตัวเกมลบ)
6. **เปิดเซิร์ฟเวอร์:** ไปที่เมนู **RobinSR Server** แล้วกดปุ่ม **"Start Server"** (ระบบจะเคลียร์พอร์ต 21000 และ 23301 อัตโนมัติ)
7. **เข้าเล่นเกม:** กดปุ่ม **"Launch Game"** เพื่อเข้าเล่นบนเซิร์ฟเวอร์ส่วนตัวได้ทันที!

---

## 💻 วิธี Build โค้ดจาก Source (สำหรับนักพัฒนา)

1. **โคลนโปรเจกต์:**
   ```powershell
   git clone https://github.com/Ma3-OS/AstralOS.git
   cd AstralOS
   ```
2. **คอมไพล์ผ่าน `menu.bat`:**
   พิมพ์ `.\menu.bat` แล้วเลือกเมนู `[13]` -> `[1]` (Build All-in-One Distribution) ระบบจะคอมไพล์ทุกอย่างให้ครบถ้วนในคำสั่งเดียว
3. **หรือคอมไพล์ด้วยตัวเอง (Manual):**
   ```powershell
   # 1. คอมไพล์ Rust Backend และ Dumper Hook DLL
   cargo build --release
   cargo build --release -p dumper
   Copy-Item target/release/version.dll bin/version.dll -Force

   # 2. ติดตั้ง Dependencies และคอมไพล์ Frontend
   cd web
   npm install
   npm run build
   cd ..

   # 3. คอมไพล์ Desktop Executable
   cd web
   npx tauri build --no-bundle
   cd ..
   Copy-Item src-tauri/target/release/hsr-desktop.exe bin/AstralOS.exe -Force
   ```

---

## 💬 คำสั่งพิมพ์ใน Chat ในเกม (In-Game Commands)

พิมพ์ข้อความคุยกับ **Server (UID 727 / RobinSR)** ในหน้าต่างแชทในเกม:

- **`sync`** — ซิงค์ข้อมูลกระเป๋า ตัวละคร และสเตตัสในเกมให้ตรงกับไฟล์ข้อมูลทันที
- **`mc harmony`** (หรือ `destruction`, `preservation`, `remembrance`) — เปลี่ยน Path ของผู้บุกเบิก (Trailblazer)
- **`march hunt`** (หรือ `preservation`) — เปลี่ยน Path ของ March 7th
- **`sw on`** / **`sw off`** — เปิด/ปิด บัฟดาเมจและลดความต้านทานของ Silver Wolf
- **`castorice on`** / **`castorice off`** — เปิด/ปิด บัฟ Castorice
- **`cl clear`** — ล้างข้อความแชทในหน้าต่าง
- **`lua <ชื่อไฟล์.lua>`** — สั่งรันสคริปต์ XLua ในตัวเกมสดๆ

---

## ❓ Troubleshooting & FAQ

<details>
<summary><b>1. เจอปัญหา <code>error: linker link.exe not found</code></b></summary>

**สาเหตุ:** ไม่ได้ติดตั้ง Visual Studio C++ Build Tools หรือไม่มี Windows SDK ในเครื่อง  
**วิธีแก้:** ติดตั้ง [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) และเลือกหัวข้อ **Desktop development with C++** ให้ครบถ้วน จากนั้นปิดเปิด Terminal ใหม่
</details>

<details>
<summary><b>2. เปิดโปรแกรม AstralOS.exe แล้วหน้าต่างเป็นสีขาวว่างเปล่า (Blank Window)</b></summary>

**สาเหตุ:** ในเครื่องไม่มีรันไทม์ WebView2 ของ Microsoft  
**วิธีแก้:** ดาวน์โหลดและติดตั้ง [Evergreen WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
</details>

<details>
<summary><b>3. ไฟล์ <code>version.dll</code> โดนตัวเปิดเกมลบหรือเปลี่ยนชื่อ</b></summary>

**สาเหตุ:** ลอนเชอร์ของเกมตรวจสอบพบไฟล์ DLL ที่แก้ไขได้  
**วิธีแก้:** กดเมนู `[3]` ใน `menu.bat` หรือกด "Deploy & Lock DLL" ในโปรแกรม AstralOS ระบบจะใส่แอตทริบิวต์ Read-Only (`attrib +r`) เพื่อล็อกไฟล์อย่างถาวร
</details>

<details>
<summary><b>4. พอร์ต 21000 หรือ 23301 ขึ้นว่าโดนใช้งานอยู่ (Port in use)</b></summary>

**สาเหตุ:** มี Process เซิร์ฟเวอร์ตัวเดิมค้างอยู่ในระบบ  
**วิธีแก้:** กด Start Server ใหม่ ระบบจะเรียก **Auto Port Conflict Resolver** เพื่อเคลียร์พอร์ตและปิด Process ที่ค้างอยู่ให้อัตโนมัติ หรือกดเมนู `[7]` ใน `menu.bat` (Stop All Local Servers)
</details>

<details>
<summary><b>5. กดเริ่มเกมแล้ว Launcher เด้งแล้วปิดเอง</b></summary>

**สาเหตุ:** ระบบพยายามเปิด `launcher.exe` ของออฟฟิเชียลซึ่งตรวจจับ Hook DLL  
**วิธีแก้:** AstralOS ได้รับการอัปเกรดให้เรียกเปิด `StarRail.exe` โดยตรงพร้อมส่ง Directory ที่ถูกต้อง ทำให้เกมเปิดติดทันที 100%
</details>

---

## 👥 Credits & Acknowledgments

AstralOS is built upon the collective research, tools, and pioneering reverse-engineering efforts of the open-source and Star Rail research communities. We extend our deepest gratitude and recognition to all the original authors, projects, and contributors:

### 🏛️ Base Project & Foundation Lineage
- **NeonTeam58 ([NeonTeam58/HSR-OWNER](https://github.com/NeonTeam58/HSR-OWNER)):** *Be Owner Dont Be Slave* — The foundational multi-tool suite that AstralOS originated from and evolved into a production-grade architecture.

### 🌟 Core Emulation & Server Protocol
- **amizing ([amizing/robinsr](https://git.neonteam.dev/amizing/robinsr)):** The RobinSR server engine repository on NeonTeam GIT, providing core dispatch gateway and KCP gameserver foundations.
- **amizing ([amizing/hkrpg-patch](https://git.neonteam.dev/amizing/hkrpg-patch)):** Direct network redirection and proxy-less hook DLL (`version.dll`) architecture.
- **yuvlian ([yuvlian/echium-server](https://github.com/yuvlian/echium-server) • [yuvlian/hsr-proto](https://github.com/yuvlian/hsr-proto) • [yuvlian/fasterproto2](https://github.com/yuvlian/fasterproto2)):** Star Rail private server research, dynamic protobuf extraction, and rapid proto compiler optimization.
- **FreeSR & LunarCore & Grasscutter & DanhengServer Communities:** Pioneer server protocol research, packet definitions, and archetypes.

### 🗣️ In-Game Language & Binary Patching
- **nie4 ([nie4/hsr-lang-patcher](https://github.com/nie4/hsr-lang-patcher)):** DesignData binary language patching engine and in-game text unlock algorithm.
- **nie4 ([nie4/hdiff-apply](https://github.com/nie4/hdiff-apply)):** HDiff binary differential update engine for game clients.

### 🧬 Reverse Engineering, Metadata & Dumper Tools
- **Perfare ([Perfare/Il2CppDumper](https://github.com/Perfare/Il2CppDumper)):** The legendary original IL2CPP metadata extraction tool that established the foundation for modern Unity reversing.
- **AzenKain ([AzenKain/Firefly-Static-Parser](https://github.com/AzenKain/Firefly-Static-Parser)):** Static IL2CPP metadata parsing, XOR decryption, and Protobuf schema reconstruction that powers the Morax suite.
- **Kabeidon-Lee (`hsr-dumping-skull`):** In-game live IL2CPP reflection memory dumper and runtime object inspection.

### 📊 Game Analyzers & Asset Tools
- **lgou2w ([lgou2w/HoYo.Gacha](https://github.com/lgou2w/HoYo.Gacha)):** Chromium disk-cache gacha record extraction and statistical analysis.
- **Scighost ([Scighost/Starward](https://github.com/Scighost/Starward)):** Game client manager and launcher design reference.
- **RaduMC ([RaduMC/AssetStudioModGUI](https://github.com/RaduMC/AssetStudioModGUI)):** Unity asset and bundle extraction research.
- **UniversalGameExtraction ([texture2ddecoder](https://github.com/UniversalGameExtraction/texture2ddecoder)):** Block-compressed texture decoding algorithms.

### 💻 UI/UX Design & Frontend Frameworks
- **Better Stack ([betterstack.com](https://betterstack.com/?ref=darkmodedesign)):** Minimalist dark-mode telemetry & cosmic dashboard design inspiration.
- **Horizon UI ([horizon-ui/horizon-tailwind-react](https://github.com/horizon-ui/horizon-tailwind-react)):** Cosmic navy dark tokens, card widgets, and dashboard layout patterns.
- **xyflow ([@xyflow/react](https://github.com/xyflow/xyflow)):** Interactive flowchart nodes and visual packet stream inspector.
- **Tauri Core Team:** Ultra-fast, memory-efficient Rust desktop runtime (Tauri 2.0).
- **Tailwind Labs & React & Vite Teams:** Modern frontend component and build stack.
- **Lucide Icons:** Clean, professional iconography throughout the application.
- **Monaco Editor (Microsoft):** Embedded code editor for the live XLua runner.

### ⚙️ Rust Crates & Low-Level Libraries
- **0xd4d ([iced-x86](https://github.com/icedland/iced)):** High-performance x86/x64 instruction decoder used in Morax's proto generator.
- **CasualX (`ilhook`, `microseh`):** Native function hooking and structured exception handling (SEH) in Rust.
- **Tokio & Axum Teams:** Asynchronous networking, HTTP gateway, and WebSocket infrastructure.
- **Rayon & DashMap Authors:** Parallel computation and lock-free thread-safe caching in the Resource Compiler.
- **Prost Authors:** High-performance Protocol Buffers implementation in Rust.
- **Epic Games / RAD Game Tools:** Oodle compression technology (`oo2core_win64.lib`).

---

## 📜 License

This project is distributed under the terms of the **[MIT License](LICENSE)**.
All referenced game trademarks, assets, and copyrights belong to their respective owners (Cognosphere / miHoYo / HoYoverse).