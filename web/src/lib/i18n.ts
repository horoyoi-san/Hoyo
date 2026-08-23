// Comprehensive i18n Translation System for AstralOS
// Complete coverage for Thai (th) and English (en)

export type Language = 'en' | 'th';

type TranslationMap = Record<string, string>;

const en: TranslationMap = {
  // Navigation Sections
  'nav.cat.server': 'Server & Runtime',
  'nav.cat.new_2026': '2026 Native Suite',
  'nav.cat.re': 'Reverse Engineering',
  'nav.cat.mod': 'Game Modifiers',
  'nav.cat.tools': 'Player Analytics',
  'nav.cat.system': 'System & Docs',

  // Navigation Items
  'nav.robinsr': 'RobinSR Server',
  'nav.robinsr.sub': 'Auto-Beta & Emulation',
  'nav.rescompiler': 'Resource Compiler',
  'nav.rescompiler.sub': 'Automated res.json Generator',
  'nav.patcher': 'Game Patcher',
  'nav.patcher.sub': 'hdiff-apply & Hook Lock',
  'nav.langpatcher': 'Language Patcher',
  'nav.langpatcher.sub': '13 Texts & 4 Audio Packs',
  'nav.sniffer': 'Packet Sniffer',
  'nav.sniffer.sub': 'Live MITM & Decryption',
  'nav.dumper': 'IL2CPP Dumper',
  'nav.dumper.sub': 'Memory Reflection Pipeline',
  'nav.morax': 'Morax Cracker',
  'nav.morax.sub': 'Metadata & DLL Generator',
  'nav.cheat': 'Game Tweaks',
  'nav.cheat.sub': 'Graphics, FPS & Camera',
  'nav.lua': 'XLua Console',
  'nav.lua.sub': 'Live Script Injection',
  'nav.unpacker': 'Asset Studio',
  'nav.unpacker.sub': 'Oodle, Textures & Models',
  'nav.design': 'Quest Editor',
  'nav.design.sub': 'Visual Node Graph',
  'nav.gacha': 'Warp Tracker',
  'nav.gacha.sub': 'Pity & Luck Metrics',
  'nav.uid': 'Relic Scorer',
  'nav.uid.sub': 'Crit Value (CV) Analytics',
  'nav.config': 'AI Agent',
  'nav.config.sub': 'MCP Model Integration',
  'nav.console': 'Telemetry Logs',
  'nav.console.sub': 'Live Diagnostics Stream',
  'nav.settings': 'Settings',
  'nav.settings.sub': 'App Preferences',
  'nav.guide': 'User Guide',
  'nav.guide.sub': 'Step-by-Step Docs',

  // TitleBar
  'titlebar.status.connected': 'Engine Connected (:42857)',
  'titlebar.status.offline': 'Engine Offline',
  'titlebar.operational': 'All Systems Operational',

  // Common Buttons & Labels
  'btn.browse': 'Browse',
  'btn.start': 'Start Service',
  'btn.stop': 'Stop Service',
  'btn.execute': 'Execute',
  'btn.save': 'Save Changes',
  'btn.clear': 'Clear All',
  'btn.export': 'Export to Disk',
  'btn.cancel': 'Cancel',
  'btn.open_folder': 'Open Folder',
  'btn.select_folder': 'Select Folder',
  'btn.open_explorer': 'Open in Explorer',
  'btn.change_folder': 'Change Folder',
  'btn.rerun': 'Re-run',
  'btn.pause': 'Pause Stream',
  'btn.resume': 'Resume Stream',
  'status.ready': 'Ready',
  'status.working': 'Working...',
  'status.done': 'Completed',
  'status.live': 'Live',
  'status.idle': 'Idle',
  'status.online': 'Engine Connected',
  'status.offline': 'Engine Offline',
  'status.running': 'Running',
  'status.failed': 'Failed',

  // Command palette
  'palette.placeholder': 'Jump to... (search pages)',
  'palette.noResults': 'No matching page',

  // Titlebar hints
  'titlebar.guideHint': 'Open User Guide',
  'titlebar.settingsHint': 'Open Settings',

  // Common
  'common.save': 'Save',
  'common.reset': 'Reset',
  'common.clear': 'Clear',
  'common.export': 'Export',
  'common.refresh': 'Refresh',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.search': 'Search...',
  'common.showAll': 'Show all',
  'common.loading': 'Loading...',
  'demo.badge': 'Demo data',
  'demo.badge.desc': 'This panel shows sample data until the backend protocol is wired.',

  // Sniffer honest states
  'sniffer.empty.title': 'No packets captured',
  'sniffer.empty.desc': 'Start capture and trigger in-game actions; live packets appear here.',
  'sniffer.select.title': 'No packet selected',
  'sniffer.select.desc': 'Select a packet from the stream to inspect its contents.',

  // Dumper pipeline tasks
  'dumper.task.cs.title': 'C# Code Dump',
  'dumper.task.cs.desc': 'Extract type definitions, field offsets and method RVAs to dump.cs',
  'dumper.task.proto.title': 'Protobuf Schemas',
  'dumper.task.proto.desc': 'Deobfuscate network messages and export StarRail.proto',
  'dumper.task.data.title': 'Excel Game Tables',
  'dumper.task.data.desc': 'Parse runtime ExcelOutput tables (Avatars, Skills, Stages, Relics) to JSON',
  'dumper.task.hdr.title': 'C++ Header for IDA/Ghidra',
  'dumper.task.hdr.desc': 'Generate il2cpp.h struct definitions for disassembler symbol import',

  // Cheat features
  'cheat.feat.dither': 'Disable Character Dithering',
  'cheat.feat.dither.desc': 'Removes fade/dithering when the camera gets close to character models.',
  'cheat.feat.hideui': 'Cinematic Clean UI Mode',
  'cheat.feat.hideui.desc': 'Hides HUD, action buttons and player names for clean screenshots.',
  'cheat.feat.fov': 'Field of View Expansion',
  'cheat.feat.fov.desc': 'Raises the camera FOV limit from 45 to 110 degrees.',
  'cheat.feat.fps': 'Framerate Cap Unlock (120 FPS+)',
  'cheat.feat.fps.desc': 'Bypasses the 60 FPS cap for high-refresh displays.',
  'cheat.feat.battle': 'Turbo Battle Animation Speed',
  'cheat.feat.battle.desc': 'Scales in-battle turn animations from 2x up to 3x/4x.',

  // Lua presets
  'lua.preset.info': 'Print Player Info',
  'lua.preset.fov': 'Camera FOV 85.0',
  'lua.preset.toast': 'In-Game Toast Notice',

  // Console
  'console.empty.title': 'No matching logs',
  'console.empty.desc': 'Log output from the engine will stream here once connected.',

  // Morax honest CLI panel
  'morax.inputs': 'Input Files',
  'morax.path_note': 'Paths are derived from the game directory in Settings — or pick the files directly.',
  'morax.cli_title': 'CLI Invocation',
  'morax.empty.title': 'No Morax run yet',
  'morax.empty.desc': 'Stats appear here once Morax runs are reported through the IPC protocol (not wired yet).',

  // Gacha
  'gacha.kpi.pity': 'Character Pity',
  'gacha.kpi.avg': 'Avg Pulls / 5★',
  'gacha.kpi.win5050': '50/50 Win Rate',
  'gacha.kpi.jades': 'Jade Equivalent',
  'gacha.history': 'Warp History',
  'gacha.early_pull': 'Early Pull',
  'gacha.pity_unit': 'pity',

  // UID
  'uid.input': 'Enter UID...',
  'uid.server_asia': 'Asia (HKG) server',
  'uid.total_cv': 'Total CV',
  'uid.relics': 'Relics',

  // Unpacker
  'unpacker.empty.title': 'No assets match',
  'unpacker.empty.desc': 'Adjust the search or type filter.',
  'unpacker.select.title': 'No asset selected',
  'unpacker.select.desc': 'Pick an asset from the browser to inspect metadata.',
  'unpacker.preview': 'preview unavailable (demo data)',
  'unpacker.export': 'Export Asset',

  // RobinSR honest panel
  'robinsr.kpi.dispatch': 'Dispatch',
  'robinsr.kpi.gameserver': 'Gameserver',
  'robinsr.kpi.engine': 'Engine IPC',
  'robinsr.kpi.players': 'Players',

  // RobinSR control center (Aurora Glass)
  'robinsr.hero.title': 'RobinSR',
  'robinsr.hero.gradient': 'Control Center',
  'robinsr.hero.desc': 'Private Star Rail server with Auto-Beta adaptation, wired to Morax and the Dumper.',
  'robinsr.hero.kicker': 'ONE-CLICK GAME ENTRY',
  'robinsr.hero.headline1': 'Enter the game in',
  'robinsr.hero.headline2': 'a single click',
  'robinsr.hero.sub': 'Server, hkrpg-patch and launcher — handled automatically. Missing files are downloaded for you.',
  'robinsr.cta': 'Enter Game',
  'robinsr.cta.busy': 'Preparing...',
  'robinsr.desktop_only': 'Available in the desktop app — browser mode shows manual commands.',
  'robinsr.step.server': '1. Server',
  'robinsr.step.patch': '2. hkrpg-patch',
  'robinsr.step.launch': '3. Launch',
  'robinsr.server_title': 'RobinSR Server',
  'robinsr.server_desc': 'Start/stop the dispatch + gameserver from here (requires robinsr-server.exe from build_all.bat).',
  'robinsr.server.start': 'Start Server',
  'robinsr.server.stop': 'Stop Server',
  'robinsr.patch_title': 'hkrpg-patch Manager',
  'robinsr.patch.installed': 'Installed',
  'robinsr.patch.missing': 'Not installed',
  'robinsr.patch.install': 'Install (auto-download)',
  'robinsr.patch.update': 'Update to latest',
  'robinsr.patch.download_manual': 'Download hkrpg.zip manually',
  'robinsr.patch.note': 'Redirects game traffic to 127.0.0.1:21000 (RobinSR). Upstream tested on 4.4.51 — on newer clients outdated modules disable themselves gracefully.',
  'robinsr.game_title': 'Game Folder',
  'robinsr.game_exe_missing': 'StarRail.exe not found in this folder — double-check the path.',
  'robinsr.game_exe_found': 'StarRail.exe found.',
  'robinsr.game_uac_note': 'Launching opens a UAC prompt once — hkrpg-patch launcher requires administrator.',

  'robinsr.launch.uac_hint': 'A Windows UAC prompt is about to appear — press Yes to launch the game.',
  'robinsr.launch.uac_canceled': 'UAC prompt was canceled — press Enter Game again and click Yes on the blue window.',
  'robinsr.kpi.patch': 'Game Patch',
  'robinsr.kpi.players_sub': 'requires running server',
  'robinsr.launch_title': 'Server Lifecycle (CLI)',
  'robinsr.launch_desc': 'RobinSR is managed from the command line — this dashboard shows status and configuration only for now.',
  'robinsr.adapt_title': 'Auto-Beta Adaptation Pipeline',
  'robinsr.stage.morax': 'Morax — metadata crack',
  'robinsr.stage.morax.desc': 'Decrypt global-metadata.dat and recover type definitions for the new client version.',
  'robinsr.stage.dumper': 'Dumper — proto & data',
  'robinsr.stage.dumper.desc': 'Extract StarRail.proto schemas and ExcelOutput tables from the running client.',
  'robinsr.stage.robinsr': 'RobinSR — server dispatch',
  'robinsr.stage.robinsr.desc': 'Serve dispatch and gameserver traffic against the freshly generated data.',
  'robinsr.gm.title': 'GM console not wired',
  'robinsr.gm.desc': 'Remote GM commands require a new RobinSR IPC channel — tracked as future work.',

  // Settings / config
  'settings.autosave': 'Auto-saved',
  'settings.reset_defaults': 'Reset Defaults',
  'config.tools_registered': 'Transport',
  'config.model_note': 'Model choice is a local hint for the MCP bridge; the engine always speaks JSON-RPC over stdio.',
  'config.ipc_port': 'Game IPC WebSocket Port',
  'config.dispatch_port': 'RobinSR HTTP Dispatch Port',

  // RobinSR Server
  'robinsr.title': 'RobinSR Private Server Emulator',
  'robinsr.desc': 'Autonomous Star Rail server emulator with automatic Beta ingestion and cross-module pipeline integration.',
  'robinsr.pipeline_badge': 'Auto-Beta Linkage Active',
  'robinsr.beta_title': '100% Automated Beta Client Ingestion Pipeline',
  'robinsr.beta_desc': 'Point directly to a new Beta game client folder. The pipeline cracks metadata, extracts protobuf schemas, and auto-updates RobinSR opcode routers.',
  'robinsr.beta_btn': 'Ingest Beta Client',
  'robinsr.beta_ingesting': 'Ingesting Binary & Updating Router...',
  'robinsr.beta_synced': 'Pipeline Synchronized & Ready',
  'robinsr.step1': '01. Binary Scan',
  'robinsr.step2': '02. Morax Crack',
  'robinsr.step3': '03. Schema Reload',
  'robinsr.step4': '04. Router Ready',
  'robinsr.stat_players': 'Active Players',
  'robinsr.stat_dispatch': 'HTTP Dispatch Port',
  'robinsr.stat_game': 'KCP Gameserver Port',
  'robinsr.stat_tick': 'Tickrate / Latency',
  'robinsr.uptime_title': 'System Uptime & Incident Monitor',
  'robinsr.spawner_title': 'Quick Avatar Spawner',
  'robinsr.spawner_desc': 'Auto E6 / Level 80 Lineup',
  'robinsr.gm_title': 'GM Command Console',
  'robinsr.gm_placeholder': 'Enter GM command (/avatar 1308 80 6, /give 1 50000, /scene 20311)...',
  'robinsr.jades_btn': '+100k Stellar Jades',
  'robinsr.heal_btn': 'Full Team Heal',

  // Dumper
  'dumper.title': 'Game Dumper & Memory Extraction',
  'dumper.desc': 'Live reflection extraction directly from the active Unity IL2CPP runtime engine.',
  'dumper.run_full': 'Run Full Dump Pipeline',
  'dumper.target_dir': 'Target Directory:',
  'dumper.open_dumps': 'Open Dumps Folder',
  'dumper.output_stream': 'Dumper Output Stream',

  // Morax
  'morax.title': 'Morax IL2CPP Metadata Cracker',
  'morax.desc': 'Ultra-fast offline IL2CPP metadata decryptor & dummy DLL assembly generator for dnSpy/ILSpy.',
  'morax.badge': 'Rayon Multi-threaded',
  'morax.run_btn': 'Execute Morax Crack',
  'morax.processing': 'Decrypting Metadata...',
  'morax.paths_title': 'Target File Paths',
  'morax.types_stat': 'Type Definitions',
  'morax.methods_stat': 'Resolved Methods',
  'morax.fields_stat': 'Field Definitions',
  'morax.time_stat': 'Parallel Decode Time',
  'morax.outputs_title': 'Generated Assemblies & Outputs',

  // Sniffer
  'sniffer.title': 'Packet Sniffer & MITM Interceptor',
  'sniffer.desc': 'Real-time KCP & TCP packet stream interceptor with dynamic XOR decryption.',
  'sniffer.start': 'Start Capture',
  'sniffer.stop': 'Stop Capture',
  'sniffer.clear': 'Clear Stream',
  'sniffer.filter_placeholder': 'Filter by CmdId or Name (PlayerLogin, SceneInfo)...',
  'sniffer.replay': 'Replay Packet to Game',

  // Cheat & Tweaks
  'cheat.title': 'Game Engine Modifiers & Quality of Life',
  'cheat.desc': 'Non-intrusive runtime shader patches, camera controls, and framerate unlocked via APC thread hooks.',
  'cheat.hooks_active': 'Hooks Active',
  'cheat.safe_badge': 'APC Safe Thread Interception',

  // Lua
  'lua.title': 'Monaco XLua Script Engine',
  'lua.desc': 'Live script injector running directly inside the Unity Engine main thread loop.',
  'lua.run_btn': 'Execute Script',
  'lua.scene_load': 'Execute on Scene Load',
  'lua.presets': 'Preset Scripts',

  // Unpacker
  'unpacker.title': 'Asset Studio & Unity Unpacker',
  'unpacker.desc': 'Extract, decompress, decode ASTC/BC7 block textures, and export 3D glTF models.',
  'unpacker.select_asb': 'Select Asb Folder',
  'unpacker.export_selected': 'Export Selected',
  'unpacker.export_disk': 'Export Asset to Disk',
  'unpacker.search': 'Search assets (Kafka, Mesh, BGM, TextMap)...',

  // Design
  'design.title': 'Visual Quest & Logic Graph',
  'design.desc': 'Interactive node graph for Star Rail dialogue branches, quest stages, and .bytes patcher.',
  'design.graph_tab': 'Node Graph',
  'design.json_tab': 'JSON Schema',
  'design.add_node': 'Add Node',
  'design.save_patch': 'Save .bytes Patch',

  // Gacha
  'gacha.title': 'Warp History & Pity Analytics',
  'gacha.desc': 'Extract warp history automatically from Chromium cache and calculate guarantee pity metrics.',
  'gacha.fetch_btn': 'Fetch Warp Records',
  'gacha.fetching': 'Reading Cache...',
  'gacha.cached': 'AuthKey Cached',
  'gacha.current_pity': 'Current Character Pity',
  'gacha.avg_pity': 'Avg. 5-Star Pity',
  'gacha.win_rate': '50 / 50 Win Ratio',
  'gacha.total_jades': 'Total Stellar Jades Spent',

  // UID
  'uid.title': 'Character Showcase & Relic Scorer',
  'uid.desc': 'Compute Relic Crit Value (CV), roll efficiency, and export character combat builds.',
  'uid.fetch': 'Fetch Profile',
  'uid.placeholder': 'Enter Star Rail UID...',

  // Config
  'config.title': 'System & AI Agent Configuration',
  'config.desc': 'Manage Model Context Protocol bridges, IPC endpoints, and runtime engine defaults.',
  'config.ai_title': 'AI Reverse-Engineering Agent',
  'config.active_model': 'Active AI Model',

  // Console
  'console.title': 'Real-time Telemetry Logs',
  'console.desc': 'Live diagnostics, memory hooks telemetry, and server stdout events.',
  'console.search': 'Search logs by keyword or module...',

  // Settings
  'settings.title': 'Settings & Preferences',
  'settings.desc': 'Configure language, directory paths, network ports, and interface preferences.',
  'settings.language': 'Language',
  'settings.language.desc': 'Choose between English and Thai interface language.',
  'settings.network': 'Network & Ports',
  'settings.network.desc': 'Configure IPC WebSocket, HTTP Dispatch, and KCP Gameserver ports.',
  'settings.paths': 'Directory Paths',
  'settings.paths.desc': 'Set default paths for game client and dump output folders.',
  'settings.game_path': 'Game Installation Path',
  'settings.dump_path': 'Dumps Output Path',
  'settings.behavior': 'Hook Behavior & Display',
  'settings.auto_connect': 'Auto-connect backend on startup',
  'settings.auto_connect.desc': 'Automatically connect to IPC WebSocket server when dashboard opens.',
  'settings.auto_attach': 'Auto-inject on game launch',
  'settings.auto_attach.desc': 'Automatically attach dumper DLL when StarRail.exe process spawns.',
  'settings.animations': 'Enable smooth animations',
  'settings.animations.desc': 'Toggle transition animations and background effects.',
  'settings.compact': 'Compact sidebar mode',
  'settings.compact.desc': 'Show icons only in sidebar to maximize workspace area.',
  'settings.saved': 'Settings Saved Successfully',
};

const th: TranslationMap = {
  // Navigation Sections
  'nav.cat.server': 'เซิร์ฟเวอร์ & รันไทม์',
  'nav.cat.new_2026': 'ฟีเจอร์ใหม่ 2026',
  'nav.cat.re': 'วิศวกรรมย้อนกลับ (RE)',
  'nav.cat.mod': 'ม็อด & ปรับแต่งเกม',
  'nav.cat.tools': 'สถิติ & สุ่มกาชา',
  'nav.cat.system': 'ระบบ & คอนโซล',

  // Navigation Items
  'nav.robinsr': 'เซิร์ฟเวอร์ RobinSR',
  'nav.robinsr.sub': 'Local Private Server',
  'nav.rescompiler': 'ตัวสร้าง res.json',
  'nav.rescompiler.sub': 'รวมไฟล์ฉาก & Config อัตโนมัติ',
  'nav.patcher': 'อัปเดตแพทช์เกม',
  'nav.patcher.sub': 'hdiff-apply & ล็อก Hook DLL',
  'nav.langpatcher': 'เปลี่ยนภาษาในเกม',
  'nav.langpatcher.sub': '13 ภาษา & 4 เสียงพากย์',
  'nav.sniffer': 'Packet Sniffer',
  'nav.sniffer.sub': 'KCP Traffic Capture',
  'nav.dumper': 'IL2CPP Dumper',
  'nav.dumper.sub': 'Memory Reflection',
  'nav.morax': 'Morax Parser',
  'nav.morax.sub': 'Offline Metadata Dump',
  'nav.cheat': 'Game Tweaks',
  'nav.cheat.sub': 'FPS, FOV & Camera',
  'nav.lua': 'XLua Scripting',
  'nav.lua.sub': 'Live Script Runner',
  'nav.unpacker': 'Asset Studio',
  'nav.unpacker.sub': 'Texture & Model Viewer',
  'nav.design': 'Quest & Logic Flow',
  'nav.design.sub': 'Dialogue Graph',
  'nav.gacha': 'Warp Tracker',
  'nav.gacha.sub': 'Pity & Stats',
  'nav.uid': 'Relic Scorer',
  'nav.uid.sub': 'Crit Value Analytics',
  'nav.config': 'MCP Agent',
  'nav.config.sub': 'Model Config',
  'nav.console': 'Telemetry Log',
  'nav.console.sub': 'Diagnostics Stream',
  'nav.settings': 'Settings',
  'nav.settings.sub': 'Preferences',
  'nav.guide': 'User Guide',
  'nav.guide.sub': 'Documentation',

  // TitleBar
  'titlebar.status.connected': 'Connected (:42857)',
  'titlebar.status.offline': 'Offline',
  'titlebar.operational': 'Operational',

  // Common Buttons & Labels
  'btn.browse': 'เลือกโฟลเดอร์',
  'btn.start': 'เริ่มทำงาน',
  'btn.stop': 'หยุดทำงาน',
  'btn.execute': 'Run',
  'btn.save': 'บันทึก',
  'btn.clear': 'ล้าง',
  'btn.export': 'ส่งออก',
  'btn.cancel': 'ยกเลิก',
  'btn.open_folder': 'เปิดโฟลเดอร์',
  'btn.select_folder': 'เลือกโฟลเดอร์',
  'btn.open_explorer': 'เปิดใน Explorer',
  'btn.change_folder': 'เปลี่ยนโฟลเดอร์',
  'btn.rerun': 'Run ซ้ำ',
  'btn.pause': 'หยุดชั่วคราว',
  'btn.resume': 'ทำงานต่อ',
  'status.ready': 'พร้อมทำงาน',
  'status.working': 'กำลังทำงาน...',
  'status.done': 'เสร็จสิ้น',
  'status.live': 'Live',
  'status.idle': 'Idle',
  'status.online': 'Connected',
  'status.offline': 'Offline',
  'status.running': 'Running',
  'status.failed': 'Failed',

  // Command palette
  'palette.placeholder': 'ค้นหาหน้า... (พิมพ์ชื่อหน้า)',
  'palette.noResults': 'ไม่พบหน้าที่ตรงกัน',

  // Titlebar hints
  'titlebar.guideHint': 'เปิดคู่มือการใช้งาน',
  'titlebar.settingsHint': 'เปิดการตั้งค่า',

  // Common
  'common.save': 'บันทึก',
  'common.reset': 'รีเซ็ต',
  'common.clear': 'ล้าง',
  'common.export': 'ส่งออก',
  'common.refresh': 'รีเฟรช',
  'common.copy': 'คัดลอก',
  'common.copied': 'คัดลอกแล้ว',
  'common.search': 'ค้นหา...',
  'common.showAll': 'แสดงทั้งหมด',
  'common.loading': 'กำลังโหลด...',
  'demo.badge': 'ข้อมูลตัวอย่าง',
  'demo.badge.desc': 'แผงนี้แสดงข้อมูลตัวอย่างไปก่อน จนกว่าจะเชื่อมกับ backend จริง',

  // Sniffer honest states
  'sniffer.empty.title': 'ยังไม่มีแพ็กเก็ต',
  'sniffer.empty.desc': 'กดเริ่มดักจับแล้วทำกิจกรรมในเกม แพ็กเก็ตจะแสดงที่นี่แบบสด',
  'sniffer.select.title': 'ยังไม่ได้เลือกแพ็กเก็ต',
  'sniffer.select.desc': 'คลิกแพ็กเก็ตจากรายการด้านซ้ายเพื่อดูรายละเอียด',

  // Dumper pipeline tasks
  'dumper.task.cs.title': 'ดึงโครงสร้างคลาส C# (dump.cs)',
  'dumper.task.cs.desc': 'ดึง Type definitions, Field offsets และ Method RVAs ออกมาเป็น dump.cs',
  'dumper.task.proto.title': 'สกีมา Protobuf (StarRail.proto)',
  'dumper.task.proto.desc': 'ถอดรหัสข้อความเครือข่ายและส่งออกไฟล์ StarRail.proto',
  'dumper.task.data.title': 'ตารางข้อมูลเกม Excel (data.json)',
  'dumper.task.data.desc': 'ดึงข้อมูล ExcelOutput สด (ตัวละคร, สกิล, ด่าน, รีลิกส์) ออกมาเป็น JSON',
  'dumper.task.hdr.title': 'C++ Header สำหรับ IDA/Ghidra (il2cpp.h)',
  'dumper.task.hdr.desc': 'สร้างนิยาม Struct ภาษา C++ สำหรับ import สัญลักษณ์ใน IDA Pro / Ghidra',

  // Cheat features
  'cheat.feat.dither': 'ปิดเอฟเฟกต์เงาโปร่งแสง (Dithering)',
  'cheat.feat.dither.desc': 'ลบเงาโปร่งแสงเวลากล้องเข้าใกล้โมเดลตัวละคร ให้เห็นรายละเอียดคมชัด',
  'cheat.feat.hideui': 'โหมดซ่อน UI สำหรับถ่ายภาพ (Cinematic)',
  'cheat.feat.hideui.desc': 'ซ่อน HUD ปุ่มสกิลและชื่อผู้เล่น เหมาะกับการถ่ายรูป/อัดวิดีโอ',
  'cheat.feat.fov': 'ขยายมุมมองกล้องกว้างพิเศษ (FOV Unlock)',
  'cheat.feat.fov.desc': 'ปลดล็อคขอบเขตมุมมองกล้องจาก 45 เป็น 110 องศา',
  'cheat.feat.fps': 'ปลดล็อคเฟรมเรต 120 FPS+ (FPS Unlock)',
  'cheat.feat.fps.desc': 'ปลดล็อคการจำกัด 60 FPS สำหรับจอ 144Hz / 240Hz',
  'cheat.feat.battle': 'เร่งความเร็วการต่อสู้ (Turbo Battle Speed)',
  'cheat.feat.battle.desc': 'เร่งแอนิเมชันการต่อสู้จาก 2x ปกติ เป็น 3x หรือ 4x',

  // Lua presets
  'lua.preset.info': 'แสดงข้อมูลตัวละครและ UID',
  'lua.preset.fov': 'ปรับมุมมองกล้อง (FOV = 85.0)',
  'lua.preset.toast': 'แสดงข้อความ Toast ในเกม',

  // Console
  'console.empty.title': 'ไม่มี log ที่ตรงกับตัวกรอง',
  'console.empty.desc': 'log จาก engine จะไหลเข้ามาที่นี่เมื่อเชื่อมต่อแล้ว',

  // Morax honest CLI panel
  'morax.inputs': 'ไฟล์อินพุต',
  'morax.path_note': 'พาธสร้างจากโฟลเดอร์เกมในหน้า Settings — หรือเลือกไฟล์ตรง ๆ ก็ได้',
  'morax.cli_title': 'คำสั่ง CLI',
  'morax.empty.title': 'ยังไม่มีการรัน Morax',
  'morax.empty.desc': 'สถิติจะแสดงที่นี่เมื่อเชื่อมผลรันผ่าน IPC protocol (ยังไม่ได้เชื่อม)',

  // Gacha
  'gacha.kpi.pity': 'การันตีตัวละคร',
  'gacha.kpi.avg': 'เฉลี่ยต่อ 5ดาว',
  'gacha.kpi.win5050': 'อัตราชนะ 50/50',
  'gacha.kpi.jades': 'เพชรที่ใช้ไป (Jade)',
  'gacha.history': 'ประวัติการกาชา',
  'gacha.early_pull': 'ออกก่อนเวลา',
  'gacha.pity_unit': 'pity',

  // UID
  'uid.input': 'กรอก UID...',
  'uid.server_asia': 'เซิร์ฟเวอร์เอเชีย (HKG)',
  'uid.total_cv': 'CV รวม',
  'uid.relics': 'รีลิก',

  // Unpacker
  'unpacker.empty.title': 'ไม่มี asset ที่ตรงกัน',
  'unpacker.empty.desc': 'ลองปรับคำค้นหาหรือตัวกรองประเภท',
  'unpacker.select.title': 'ยังไม่ได้เลือก asset',
  'unpacker.select.desc': 'เลือก asset จากรายการด้านซ้ายเพื่อดูรายละเอียด',
  'unpacker.preview': 'ไม่มีพรีวิว (ข้อมูลตัวอย่าง)',
  'unpacker.export': 'ส่งออก Asset',

  // RobinSR honest panel
  'robinsr.kpi.dispatch': 'Dispatch',
  'robinsr.kpi.gameserver': 'Gameserver',
  'robinsr.kpi.engine': 'Engine IPC',
  'robinsr.kpi.players': 'ผู้เล่น',

  // RobinSR control center (Aurora Glass)
  'robinsr.hero.title': 'RobinSR',
  'robinsr.hero.gradient': 'Control Center',
  'robinsr.hero.desc': 'เซิร์ฟเวอร์ Star Rail ส่วนตัว พร้อม Auto-Beta เชื่อมโยงกับ Morax และ Dumper',
  'robinsr.hero.kicker': 'เข้าเกมในคลิกเดียว',
  'robinsr.hero.headline1': 'เข้าสู่เกมได้ใน',
  'robinsr.hero.headline2': 'คลิกเดียว',
  'robinsr.hero.sub': 'เซิร์ฟเวอร์ hkrpg-patch และตัวเปิดเกม จัดการให้อัตโนมัติ ถ้าไฟล์ไม่มีจะดาวน์โหลดให้เอง',
  'robinsr.cta': 'เข้าเกม',
  'robinsr.cta.busy': 'กำลังเตรียม...',
  'robinsr.desktop_only': 'ใช้ได้ในแอป Desktop เท่านั้น — โหมดเบราว์เซอร์แสดงคำสั่ง manual',
  'robinsr.step.server': '1. เซิร์ฟเวอร์',
  'robinsr.step.patch': '2. hkrpg-patch',
  'robinsr.step.launch': '3. เปิดเกม',
  'robinsr.server_title': 'เซิร์ฟเวอร์ RobinSR',
  'robinsr.server_desc': 'เปิด/ปิด dispatch + gameserver จากที่นี่ได้เลย (ต้องมี robinsr-server.exe จาก build_all.bat)',
  'robinsr.server.start': 'เริ่มเซิร์ฟเวอร์',
  'robinsr.server.stop': 'หยุดเซิร์ฟเวอร์',
  'robinsr.patch_title': 'จัดการ hkrpg-patch',
  'robinsr.patch.installed': 'ติดตั้งแล้ว',
  'robinsr.patch.missing': 'ยังไม่ติดตั้ง',
  'robinsr.patch.install': 'ติดตั้ง (โหลดอัตโนมัติ)',
  'robinsr.patch.update': 'อัปเดตเป็นเวอร์ชันล่าสุด',
  'robinsr.patch.download_manual': 'ดาวน์โหลด hkrpg.zip เอง',
  'robinsr.patch.note': 'เปลี่ยนทาง traffic ของเกมไป 127.0.0.1:21000 (RobinSR) ต้นทางทดสอบกับ 4.4.51 — คลายเอนต์ใหม่กว่า โมดูลที่ล้าสมัยจะปิดตัวเองอย่างปลอดภัย',
  'robinsr.game_title': 'โฟลเดอร์เกม',
  'robinsr.game_exe_missing': 'ไม่พบ StarRail.exe ในโฟลเดอร์นี้ — ตรวจสอบพาธอีกครั้ง',
  'robinsr.game_exe_found': 'พบ StarRail.exe แล้ว',
  'robinsr.game_uac_note': 'ตอนเปิดเกมจะมีหน้าต่าง UAC ถามสิทธิ์ admin 1 ครั้ง — ตัว launcher ของ hkrpg-patch กำหนดเอง',

  'robinsr.launch.uac_hint': 'กำลังจะมีหน้าต่าง UAC สีน้ำเงินเด้งขึ้น — กด Yes เพื่อเปิดเกม',
  'robinsr.launch.uac_canceled': 'ยกเลิก UAC ไป — กดปุ่มเข้าเกมอีกครั้งแล้วกด Yes ในหน้าต่างสีน้ำเงิน',
  'robinsr.kpi.patch': 'แพตช์เกม',
  'robinsr.kpi.players_sub': 'ต้องรันเซิร์ฟเวอร์ก่อน',
  'robinsr.launch_title': 'การรันเซิร์ฟเวอร์ (CLI)',
  'robinsr.launch_desc': 'RobinSR ควบคุมผ่าน command line — หน้านี้แสดงสถานะและค่า config เท่านั้นในตอนนี้',
  'robinsr.adapt_title': 'ไปป์ไลน์ปรับตัว Auto-Beta',
  'robinsr.stage.morax': 'Morax — ถอดรหัส metadata',
  'robinsr.stage.morax.desc': 'ถอดรหัส global-metadata.dat และกู้ type definitions ของคลายเอนต์เวอร์ชันใหม่',
  'robinsr.stage.dumper': 'Dumper — proto และข้อมูล',
  'robinsr.stage.dumper.desc': 'ดึงสกีมา StarRail.proto และตาราง ExcelOutput จากคลายเอนต์ที่รันอยู่',
  'robinsr.stage.robinsr': 'RobinSR — เซิร์ฟเวอร์',
  'robinsr.stage.robinsr.desc': 'ให้บริการ dispatch และ gameserver ด้วยข้อมูลที่เพิ่ง generate',
  'robinsr.gm.title': 'GM console ยังไม่เชื่อมต่อ',
  'robinsr.gm.desc': 'คำสั่ง GM ระยะไกลต้องมี IPC channel ใหม่ของ RobinSR — บันทึกไว้เป็นงานอนาคต',

  // Settings / config
  'settings.autosave': 'บันทึกอัตโนมัติ',
  'settings.reset_defaults': 'คืนค่าเริ่มต้น',
  'config.tools_registered': 'ช่องทางเชื่อมต่อ',
  'config.model_note': 'การเลือกโมเดลเป็นค่า hint ในเครื่องสำหรับ MCP bridge — engine สื่อสารผ่าน JSON-RPC บน stdio เสมอ',
  'config.ipc_port': 'พอร์ต IPC WebSocket ของเกม',
  'config.dispatch_port': 'พอร์ต RobinSR HTTP Dispatch',

  // RobinSR Server
  'robinsr.title': 'เซิร์ฟเวอร์จำลอง RobinSR',
  'robinsr.desc': 'เซิร์ฟเวอร์ Star Rail ส่วนตัว พร้อมระบบ Auto-Beta อัปเดตแพทช์อัตโนมัติ 100% เชื่อมโยงกับ Morax และ Dumper',
  'robinsr.pipeline_badge': 'ระบบเชื่อมโยง Auto-Beta ทำงานอยู่',
  'robinsr.beta_title': 'ระบบ Auto-Beta Ingestion (อัปเดตเวอร์ชันใหม่ 100% อัตโนมัติ)',
  'robinsr.beta_desc': 'เวลามีตัวเกมเบต้าเวอร์ชันใหม่ แค่ชี้ไปที่โฟลเดอร์เกม ระบบจะถอดรหัส Metadata, ดึง Proto สด และอัปเดต Router ของ RobinSR ให้อัตโนมัติทันที',
  'robinsr.beta_btn': 'เริ่ม Ingestion ตัวเกมเบต้า',
  'robinsr.beta_ingesting': 'กำลังแกะ Binary และอัปเดต Router...',
  'robinsr.beta_synced': 'ระบบเชื่อมโยงสำเร็จ พร้อมเล่นแล้ว',
  'robinsr.step1': '01. สแกนไฟล์เกม',
  'robinsr.step2': '02. Morax ถอดรหัส',
  'robinsr.step3': '03. โหลดสกีมา Proto',
  'robinsr.step4': '04. Router พร้อมใช้งาน',
  'robinsr.stat_players': 'ผู้เล่นออนไลน์',
  'robinsr.stat_dispatch': 'พอร์ต HTTP Dispatch',
  'robinsr.stat_game': 'พอร์ตเกม KCP UDP',
  'robinsr.stat_tick': 'Tickrate / Latency',
  'robinsr.uptime_title': 'สถานะเซิร์ฟเวอร์ & Uptime Monitor',
  'robinsr.spawner_title': 'เสกตัวละครด่วน (Quick Avatar Spawner)',
  'robinsr.spawner_desc': 'ปลดล็อค E6 เลเวล 80 อัตโนมัติ',
  'robinsr.gm_title': 'คอนโซลคำสั่ง GM ในเกม',
  'robinsr.gm_placeholder': 'พิมพ์คำสั่ง GM เช่น (/avatar 1308 80 6, /give 1 50000, /scene 20311)...',
  'robinsr.jades_btn': '+100,000 Stellar Jades',
  'robinsr.heal_btn': 'ฮีลเลือดและพลังงานเต็มทีม',

  // Dumper
  'dumper.title': 'IL2CPP Dumper (ดึงข้อมูล Memory สด)',
  'dumper.desc': 'ดึงโครงสร้างคลาส เมธอด และสกีมา Proto จากกระบวนการเกม StarRail.exe โดยตรง',
  'dumper.run_full': 'ดึงข้อมูลทั้งหมด',
  'dumper.target_dir': 'โฟลเดอร์ปลายทาง:',
  'dumper.open_dumps': 'เปิดโฟลเดอร์ Dumps',
  'dumper.output_stream': 'เอาต์พุตการทำงานของ Dumper',

  // Morax
  'morax.title': 'Morax Metadata Cracker',
  'morax.desc': 'โปรแกรมถอดรหัส global-metadata.dat ความเร็วสูง และสร้าง Dummy DLL สำหรับเปิดใน dnSpy/ILSpy',
  'morax.badge': 'Rayon มัลติเธรด',
  'morax.run_btn': 'เริ่มการถอดรหัส Morax',
  'morax.processing': 'กำลังถอดรหัส Metadata...',
  'morax.paths_title': 'ตำแหน่งไฟล์เป้าหมาย',
  'morax.types_stat': 'คลาสทั้งหมด (Types)',
  'morax.methods_stat': 'เมธอดที่พบ (Methods)',
  'morax.fields_stat': 'ฟิลด์ทั้งหมด (Fields)',
  'morax.time_stat': 'เวลาถอดรหัสแบบขนาน',
  'morax.outputs_title': 'ไฟล์ Assembly ที่สร้างสำเร็จ',

  // Sniffer
  'sniffer.title': 'Packet Sniffer & ดักฟังเครือข่าย',
  'sniffer.desc': 'ดักฟังการรับส่งแพ็กเก็ต UDP/KCP สด พร้อมถอดรหัส XOR แสดงเป็น JSON ทันที',
  'sniffer.start': 'เริ่มดักจับแพ็กเก็ต',
  'sniffer.stop': 'หยุดดักจับ',
  'sniffer.clear': 'ล้างประวัติ',
  'sniffer.filter_placeholder': 'ค้นหาด้วย CmdId หรือชื่อแพ็กเก็ต (PlayerLogin, SceneInfo)...',
  'sniffer.replay': 'ส่งแพ็กเก็ตซ้ำเข้าเกม (Replay)',

  // Cheat & Tweaks
  'cheat.title': 'ปรับแต่งตัวเกม & คุณภาพชีวิต (Game Tweaks)',
  'cheat.desc': 'สวิตช์ปรับภาพ ลบเงาตัวละคร ซ่อน UI และปลดล็อค 120 FPS ผ่าน Hook ใน Memory อย่างปลอดภัย',
  'cheat.hooks_active': 'Hook กำลังทำงาน',
  'cheat.safe_badge': 'APC Safe Thread Interception',

  // Lua
  'lua.title': 'Monaco XLua สคริปต์คอนโซล',
  'lua.desc': 'เขียนและรันโค้ดสคริปต์ในเอนจินเกมสดๆ ผ่าน XLua บนเธรดหลักของเกม',
  'lua.run_btn': 'รันสคริปต์เข้าเกม',
  'lua.scene_load': 'รันอัตโนมัติเมื่อโหลดฉากใหม่',
  'lua.presets': 'สคริปต์สำเร็จรูป',

  // Unpacker
  'unpacker.title': 'Asset Studio & ตัวแกะไฟล์เกม',
  'unpacker.desc': 'แตกไฟล์ AssetBundle คลายการบีบอัด Oodle ถอดภาพ ASTC/BC7 และแปลงโมเดลเป็น 3D glTF',
  'unpacker.select_asb': 'เลือกโฟลเดอร์ Asb',
  'unpacker.export_selected': 'ส่งออกไฟล์ที่เลือก',
  'unpacker.export_disk': 'ส่งออกไฟล์ลงดิสก์',
  'unpacker.search': 'ค้นหาไฟล์ asset (Kafka, Mesh, BGM, TextMap)...',

  // Design
  'design.title': 'แก้ไขเควสและลอจิก (Node Graph)',
  'design.desc': 'ผืนผ้าใบแบบลากวางสำหรับจัดโครงสร้างบทสนทนา เส้นทางเควส และสร้างไฟล์แพทช์ .bytes',
  'design.graph_tab': 'ผืนผ้าใบ Node Graph',
  'design.json_tab': 'โครงสร้าง JSON Schema',
  'design.add_node': 'เพิ่ม Node',
  'design.save_patch': 'บันทึกแพทช์ .bytes',

  // Gacha
  'gacha.title': 'วิเคราะห์ประวัติกาชา & Pity',
  'gacha.desc': 'ดึงประวัติการเปิดตู้จากแคชของตัวเกมอัตโนมัติ และคำนวณการันตี Pity พร้อมสถิติดวง',
  'gacha.fetch_btn': 'ดึงประวัติการสุ่ม',
  'gacha.fetching': 'กำลังอ่านแคชเกม...',
  'gacha.cached': 'พบ AuthKey ในแคชแล้ว',
  'gacha.current_pity': 'Pity ตัวละครปัจจุบัน',
  'gacha.avg_pity': 'ค่าเฉลี่ย 5 ดาว (Pulls)',
  'gacha.win_rate': 'อัตราการชนะ 50 / 50',
  'gacha.total_jades': 'รวม Stellar Jades ที่ใช้',

  // UID
  'uid.title': 'โชว์เคสตัวละคร & คิดคะแนน Relic (CV)',
  'uid.desc': 'คำนวณ Crit Value (CV) ของ Relic แต่ละชิ้น และตรวจสอบประสิทธิภาพการอัปสเตตัส',
  'uid.fetch': 'ดึงข้อมูลโปรไฟล์',
  'uid.placeholder': 'ใส่ Star Rail UID...',

  // Config
  'config.title': 'ตั้งค่าระบบ & AI Agent (MCP)',
  'config.desc': 'จัดการการเชื่อมต่อ Model Context Protocol (MCP), พอร์ต IPC, และโมเดล AI',
  'config.ai_title': 'AI ผู้ช่วยวิเคราะห์ Reverse Engineering',
  'config.active_model': 'โมเดล AI ที่ใช้งาน',

  // Console
  'console.title': 'บันทึก Telemetry Log สด',
  'console.desc': 'สตรีมข้อความการทำงาน การตรวจจับ Memory และเอาต์พุตของเซิร์ฟเวอร์แบบเรียลไทม์',
  'console.search': 'ค้นหา log ด้วยคำค้นหาหรือชื่อโมดูล...',

  // Settings
  'settings.title': 'ตั้งค่าระบบ & ค่ากำหนด',
  'settings.desc': 'ปรับแต่งภาษา โฟลเดอร์จัดเก็บข้อมูล พอร์ตเครือข่าย และการแสดงผล',
  'settings.language': 'ภาษาของโปรแกรม (Language)',
  'settings.language.desc': 'เลือกระหว่างภาษาไทย (TH) และ English (EN)',
  'settings.network': 'เครือข่ายและพอร์ต (Network Ports)',
  'settings.network.desc': 'ตั้งค่าพอร์ต IPC WebSocket, HTTP Dispatch, และ KCP Gameserver',
  'settings.paths': 'โฟลเดอร์ไฟล์ในเครื่อง (File Paths)',
  'settings.paths.desc': 'กำหนดตำแหน่งโฟลเดอร์ตัวเกม และโฟลเดอร์เก็บไฟล์ Output จาก Dumper',
  'settings.game_path': 'ที่อยู่ติดตั้งตัวเกม Star Rail',
  'settings.dump_path': 'ที่อยู่เก็บไฟล์ Dumps Output',
  'settings.behavior': 'พฤติกรรมการ Hook & การแสดงผล',
  'settings.auto_connect': 'เชื่อมต่อ Backend อัตโนมัติเมื่อเปิดแอป',
  'settings.auto_connect.desc': 'ลองเชื่อมต่อ IPC WebSocket ทันทีที่เปิดหน้าต่างโปรแกรม',
  'settings.auto_attach': 'Inject เข้าเกมอัตโนมัติเมื่อเปิด StarRail.exe',
  'settings.auto_attach.desc': 'Inject DLL ของ Dumper ทันทีที่ตรวจพบกระบวนการเกม',
  'settings.animations': 'เปิดใช้ Animation เอฟเฟกต์การเคลื่อนไหว',
  'settings.animations.desc': 'เปิดหรือปิดเอฟเฟกต์แสงและการเลื่อนหน้าต่าง',
  'settings.compact': 'Sidebar แบบกะทัดรัด (Compact Mode)',
  'settings.compact.desc': 'แสดงเฉพาะไอคอนในเมนูด้านซ้ายเพื่อเพิ่มพื้นที่หน้าจอ',
  'settings.saved': 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
};

const translations: Record<Language, TranslationMap> = { en, th };

export function getTranslation(lang: Language, key: string): string {
  return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
}
