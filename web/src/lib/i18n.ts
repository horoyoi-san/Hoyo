// Comprehensive i18n Translation System for AstralOS
// Complete coverage for Thai (th) and English (en)

export type Language = 'en' | 'th';

type TranslationMap = Record<string, string>;

const en: TranslationMap = {
  // Navigation Sections
  'nav.cat.server': 'Server & Runtime',
  'nav.cat.new_2026': 'Core Utilities',
  'nav.cat.re': 'Reverse Engineering',
  'nav.cat.mod': 'Game Modifiers',
  'nav.cat.system': 'System & Docs',

  // Navigation Items
  'nav.robinsr': 'RobinSR Server',
  'nav.robinsr.sub': 'Local Private Server',
  'nav.rescompiler': 'Resource Compiler',
  'nav.rescompiler.sub': 'Resource Bundler',
  'nav.patcher': 'Game Patcher',
  'nav.patcher.sub': 'Delta Patch & DLL Manager',
  'nav.langpatcher': 'Language Patcher',
  'nav.langpatcher.sub': 'Text & Voice Selector',
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
  'dumper.task.res.title': 'Live In-Memory Resources',
  'dumper.task.res.desc': 'Extract active TextMap, Config, and ExcelOutput straight from engine heap memory',

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

  // RobinSR control center
  'robinsr.hero.title': 'RobinSR',
  'robinsr.hero.gradient': 'Runtime Console',
  'robinsr.hero.desc': 'Protocol emulation environment supporting dynamic schema synchronization and reverse engineering pipelines.',
  'robinsr.hero.kicker': 'CLIENT RUNTIME LAUNCHER',
  'robinsr.hero.headline1': 'Initialize and launch',
  'robinsr.hero.headline2': 'client session',
  'robinsr.hero.sub': 'Manages local server lifecycle, proxy interception hooks, and process execution dependencies.',
  'robinsr.cta': 'Launch Client',
  'robinsr.cta.busy': 'Initializing...',
  'robinsr.desktop_only': 'Desktop execution required. Browser environment displays manual commands only.',
  'robinsr.step.server': '1. Server Engine',
  'robinsr.step.patch': '2. Proxy Patch',
  'robinsr.step.launch': '3. Process Launch',
  'robinsr.server_title': 'RobinSR Server Engine',
  'robinsr.server_desc': 'Manage HTTP dispatch and KCP gameserver processes (requires robinsr-server.exe binary).',
  'robinsr.server.start': 'Start Server',
  'robinsr.server.stop': 'Stop Server',
  'robinsr.patch_title': 'Traffic Redirection Patch',
  'robinsr.patch.installed': 'Installed',
  'robinsr.patch.missing': 'Not installed',
  'robinsr.patch.install': 'Install Patch',
  'robinsr.patch.update': 'Update to latest',
  'robinsr.patch.download_manual': 'Download hkrpg.zip archive',
  'robinsr.patch.note': 'Redirects client network traffic to 127.0.0.1:21000. Verified against client baseline 4.4.51.',
  'robinsr.game_title': 'Client Directory',
  'robinsr.game_exe_missing': 'Target executable StarRail.exe not found in specified directory.',
  'robinsr.game_exe_found': 'Target executable StarRail.exe verified.',
  'robinsr.game_uac_note': 'Process execution requests administrative elevation (UAC) for loopback network redirection.',

  'robinsr.launch.uac_hint': 'Administrative prompt requested. Accept UAC prompt to proceed with process execution.',
  'robinsr.launch.uac_canceled': 'UAC elevation was denied or canceled. Re-execute to grant required permissions.',
  'robinsr.kpi.patch': 'Proxy Patch',
  'robinsr.kpi.players_sub': 'Server running required',
  'robinsr.launch_title': 'Process Lifecycle Controls',
  'robinsr.launch_desc': 'CLI process lifecycle management interface for protocol server and telemetry monitors.',
  'robinsr.adapt_title': 'Client Ingestion Pipeline',
  'robinsr.stage.morax': 'Morax — Metadata Extraction',
  'robinsr.stage.morax.desc': 'Decrypt global-metadata.dat and recover type definitions for target client binary.',
  'robinsr.stage.dumper': 'Dumper — Schema & Data',
  'robinsr.stage.dumper.desc': 'Extract StarRail.proto schemas and ExcelOutput runtime tables from memory space.',
  'robinsr.stage.robinsr': 'RobinSR — Routing Gateway',
  'robinsr.stage.robinsr.desc': 'Deploy updated opcode routing tables and dispatch handlers.',
  'robinsr.gm.title': 'Command Interface',
  'robinsr.gm.desc': 'Remote command dispatch interface pending dedicated IPC channel implementation.',

  // Settings / config
  'settings.autosave': 'Auto-saved',
  'settings.reset_defaults': 'Restore Defaults',
  'config.tools_registered': 'Transport Channels',
  'config.model_note': 'Model selection configures MCP routing hint. Primary RPC transport communicates over stdio.',
  'config.ipc_port': 'Game IPC WebSocket Port',
  'config.dispatch_port': 'HTTP Dispatch Gateway Port',

  // RobinSR Server
  'robinsr.title': 'RobinSR Protocol Emulator',
  'robinsr.desc': 'Local network protocol emulator for Star Rail client runtime, integrating automated schema parsing and routing pipelines.',
  'robinsr.pipeline_badge': 'Schema Ingestion Active',
  'robinsr.beta_title': 'Client Beta Ingestion Pipeline',
  'robinsr.beta_desc': 'Specify client installation directory to parse metadata, extract protobuf schemas, and update RobinSR command routing tables.',
  'robinsr.beta_btn': 'Ingest Client Binary',
  'robinsr.beta_ingesting': 'Processing binary and updating router tables...',
  'robinsr.beta_synced': 'Pipeline synchronized successfully',
  'robinsr.step1': '01. Binary Analysis',
  'robinsr.step2': '02. Metadata Recovery',
  'robinsr.step3': '03. Schema Synchronization',
  'robinsr.step4': '04. Route Compilation',
  'robinsr.stat_players': 'Connected Sessions',
  'robinsr.stat_dispatch': 'HTTP Dispatch Port',
  'robinsr.stat_game': 'KCP Gameserver Port',
  'robinsr.stat_tick': 'Tickrate / Latency',
  'robinsr.uptime_title': 'Service Health & Uptime Metrics',
  'robinsr.spawner_title': 'Entity Provisioning',
  'robinsr.spawner_desc': 'Configure avatar parameters and inventory state',
  'robinsr.gm_title': 'Administrative Command Interface',
  'robinsr.gm_placeholder': 'Enter command (/avatar 1308 80 6, /give 1 50000, /scene 20311)...',
  'robinsr.jades_btn': '+100k Stellar Jades',
  'robinsr.heal_btn': 'Restore Party State',

  // Dumper
  'dumper.title': 'IL2CPP Memory Reflection Pipeline',
  'dumper.desc': 'Extract type definitions, method pointers, and protobuf schemas from active client process memory.',
  'dumper.run_full': 'Execute Extraction Pipeline',
  'dumper.target_dir': 'Output Directory:',
  'dumper.open_dumps': 'Open Output Directory',
  'dumper.output_stream': 'Extraction Telemetry Stream',

  // Morax
  'morax.title': 'Morax Metadata Recovery',
  'morax.desc': 'Offline IL2CPP metadata decryptor and dummy assembly generator for symbol recovery.',
  'morax.badge': 'Metadata Engine',
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
  'nav.cat.new_2026': 'เครื่องมือระบบ',
  'nav.cat.re': 'วิศวกรรมย้อนกลับ (RE)',
  'nav.cat.mod': 'ม็อด & ปรับแต่งเกม',
  'nav.cat.system': 'ระบบ & คอนโซล',

  // Navigation Items
  'nav.robinsr': 'RobinSR Server',
  'nav.robinsr.sub': 'เซิร์ฟเวอร์จำลองโปรโตคอล',
  'nav.rescompiler': 'Resource Compiler',
  'nav.rescompiler.sub': 'คอมไพล์โครงสร้างฉากและคอนฟิก',
  'nav.patcher': 'Game Patcher',
  'nav.patcher.sub': 'Delta Patch & DLL Manager',
  'nav.langpatcher': 'Language Patcher',
  'nav.langpatcher.sub': 'กำหนดภาษาข้อความและเสียงพากย์',
  'nav.sniffer': 'Packet Sniffer',
  'nav.sniffer.sub': 'ดักจับและถอดรหัสแพ็กเก็ต',
  'nav.dumper': 'IL2CPP Dumper',
  'nav.dumper.sub': 'สกัดสกีมาและหน่วยความจำ',
  'nav.morax': 'Morax Cracker',
  'nav.morax.sub': 'ถอดรหัส Metadata และสร้าง Assembly',
  'nav.cheat': 'Runtime Modifiers',
  'nav.cheat.sub': 'ปรับแต่งการเรนเดอร์และเฟรมเรต',
  'nav.lua': 'XLua Console',
  'nav.lua.sub': 'อินเจกต์และรันสคริปต์รันไทม์',
  'nav.unpacker': 'Asset Studio',
  'nav.unpacker.sub': 'สกัดพื้นผิวและโมเดล 3D',
  'nav.design': 'Quest & Logic Flow',
  'nav.design.sub': 'ผืนผ้าใบแก้ไขกราฟโหนด',
  'nav.config': 'MCP AI Configuration',
  'nav.config.sub': 'กำหนดค่าบริดจ์และโมเดล',
  'nav.console': 'Telemetry Console',
  'nav.console.sub': 'สตรีมข้อความวินิจฉัยสด',
  'nav.settings': 'Settings',
  'nav.settings.sub': 'การกำหนดค่าระบบ',
  'nav.guide': 'User Guide',
  'nav.guide.sub': 'เอกสารคู่มือทางเทคนิค',

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
  'dumper.task.res.title': 'การสกัดรีซอร์สจากหน่วยความจำ (In-Memory Resources)',
  'dumper.task.res.desc': 'สกัดตาราง TextMap, Config และ ExcelOutput จากหน่วยความจำฮีปของไคลเอนต์',

  // Cheat features
  'cheat.feat.dither': 'ปิดเอฟเฟกต์ Dithering ของโมเดลตัวละคร',
  'cheat.feat.dither.desc': 'ยกเลิกการเรนเดอร์ Fade Dithering เมื่อกล้องอยู่ใกล้โมเดลตัวละคร',
  'cheat.feat.hideui': 'โหมดซ่อนอินเทอร์เฟซ (Cinematic UI)',
  'cheat.feat.hideui.desc': 'ซ่อนองค์ประกอบ HUD, แผงควบคุมคำสั่ง และชื่อผู้เล่น',
  'cheat.feat.fov': 'ปลดล็อคขอบเขตมุมมองกล้อง (Field of View)',
  'cheat.feat.fov.desc': 'ขยายขีดจำกัดมุมมองกล้อง (FOV) จาก 45 องศาเป็นสูงสุด 110 องศา',
  'cheat.feat.fps': 'ปลดล็อคขีดจำกัดอัตราเฟรมเรต (Framerate Unlock)',
  'cheat.feat.fps.desc': 'ข้ามการจำกัด 60 FPS สำหรับจอแสดงผลอัตรารีเฟรชสูง (120Hz/144Hz+)',
  'cheat.feat.battle': 'การปรับความเร็วแอนิเมชันการต่อสู้ (Battle Speed Scaling)',
  'cheat.feat.battle.desc': 'ปรับอัตราความเร็วแอนิเมชันการต่อสู้เกินพิกัดมาตรฐาน (3x / 4x)',

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

  // RobinSR control center
  'robinsr.hero.title': 'RobinSR',
  'robinsr.hero.gradient': 'คอนโซลควบคุมรันไทม์',
  'robinsr.hero.desc': 'สภาพแวดล้อมจำลองโปรโตคอลเครือข่าย รองรับการซิงค์สกีมาและไปป์ไลน์วิศวกรรมย้อนกลับ',
  'robinsr.hero.kicker': 'ตัวเรียกใช้ไคลเอนต์รันไทม์',
  'robinsr.hero.headline1': 'เริ่มต้นและเชื่อมต่อ',
  'robinsr.hero.headline2': 'เซสชันไคลเอนต์',
  'robinsr.hero.sub': 'จัดการวงจรรันไทม์เซิร์ฟเวอร์ จำลองการพร็อกซีการรับส่งข้อมูล และการเริ่มต้นกระบวนการของเกม',
  'robinsr.cta': 'เริ่มเซสชันเกม',
  'robinsr.cta.busy': 'กำลังเตรียมการ...',
  'robinsr.desktop_only': 'รองรับเฉพาะแอปเดสก์ท็อป — โหมดเว็บเบราว์เซอร์จะแสดงเฉพาะคำสั่ง CLI',
  'robinsr.step.server': '1. เซิร์ฟเวอร์',
  'robinsr.step.patch': '2. พร็อกซีแพตช์',
  'robinsr.step.launch': '3. เริ่มโปรเซส',
  'robinsr.server_title': 'เซิร์ฟเวอร์ RobinSR',
  'robinsr.server_desc': 'ควบคุมการเริ่มและหยุดกระบวนการ HTTP dispatch และ KCP gameserver (ต้องการไฟล์ robinsr-server.exe)',
  'robinsr.server.start': 'เริ่มเซิร์ฟเวอร์',
  'robinsr.server.stop': 'หยุดเซิร์ฟเวอร์',
  'robinsr.patch_title': 'จัดการ Traffic Redirection Patch',
  'robinsr.patch.installed': 'ติดตั้งแล้ว',
  'robinsr.patch.missing': 'ยังไม่ได้ติดตั้ง',
  'robinsr.patch.install': 'ติดตั้งแพตช์',
  'robinsr.patch.update': 'อัปเดตเวอร์ชันล่าสุด',
  'robinsr.patch.download_manual': 'ดาวน์โหลดไฟล์ hkrpg.zip',
  'robinsr.patch.note': 'เปลี่ยนเส้นทาง Network Traffic ไปยัง 127.0.0.1:21000 (RobinSR) ทดสอบร่วมกับไคลเอนต์ 4.4.51',
  'robinsr.game_title': 'ไดเรกทอรีไคลเอนต์',
  'robinsr.game_exe_missing': 'ไม่พบไฟล์ StarRail.exe ในไดเรกทอรีที่ระบุ — โปรดตรวจสอบพาธอีกครั้ง',
  'robinsr.game_exe_found': 'ตรวจสอบพบไฟล์ StarRail.exe แล้ว',
  'robinsr.game_uac_note': 'การเปิดโปรเซสจำเป็นต้องได้รับสิทธิ์ผู้ดูแลระบบ (UAC) เพื่อกำหนดค่า Loopback Network Redirection',

  'robinsr.launch.uac_hint': 'ระบบกำลังขอสิทธิ์ระดับผู้ดูแลระบบ (UAC) — เลือก ใช่/Yes เพื่อเริ่มกระบวนการ',
  'robinsr.launch.uac_canceled': 'การอนุญาตสิทธิ์ UAC ถูกยกเลิก — โปรดเลือกเริ่มเซสชันใหม่และอนุมัติสิทธิ์',
  'robinsr.kpi.patch': 'พร็อกซีแพตช์',
  'robinsr.kpi.players_sub': 'ต้องเริ่มเซิร์ฟเวอร์ก่อน',
  'robinsr.launch_title': 'การจัดการวงจรกระบวนการ (Process Lifecycle)',
  'robinsr.launch_desc': 'แผงควบคุมวงจรกระบวนการเซิร์ฟเวอร์และบันทึกการทำงานของโปรโตคอล',
  'robinsr.adapt_title': 'ไปป์ไลน์ประมวลผลข้อมูลไคลเอนต์ (Client Ingestion Pipeline)',
  'robinsr.stage.morax': 'Morax — ถอดรหัส Metadata',
  'robinsr.stage.morax.desc': 'ถอดรหัส global-metadata.dat และกู้คืนโครงสร้าง Type Definitions ของไคลเอนต์เป้าหมาย',
  'robinsr.stage.dumper': 'Dumper — สกีมาและตารางข้อมูล',
  'robinsr.stage.dumper.desc': 'สกัดสกีมา StarRail.proto และตาราง ExcelOutput จากหน่วยความจำของไคลเอนต์',
  'robinsr.stage.robinsr': 'RobinSR — เกตเวย์กำหนดเส้นทาง',
  'robinsr.stage.robinsr.desc': 'อัปเดตตารางเส้นทางคำสั่ง (Opcode Router) และให้บริการ Dispatch ด้วยสกีมาใหม่',
  'robinsr.gm.title': 'คอนโซลคำสั่งจัดการ (GM)',
  'robinsr.gm.desc': 'การส่งคำสั่ง GM ระยะไกลอยู่ระหว่างการพัฒนาแชนเนล IPC ของ RobinSR',

  // Settings / config
  'settings.autosave': 'บันทึกอัตโนมัติ',
  'settings.reset_defaults': 'คืนค่าเริ่มต้น',
  'config.tools_registered': 'ช่องทางเชื่อมต่อ',
  'config.model_note': 'การเลือกโมเดลเป็นค่าแนะนำสำหรับบริดจ์ MCP — เครื่องมือหลักสื่อสารผ่าน JSON-RPC บน stdio',
  'config.ipc_port': 'พอร์ต IPC WebSocket ของเกม',
  'config.dispatch_port': 'พอร์ต HTTP Dispatch Gateway',

  // RobinSR Server
  'robinsr.title': 'เซิร์ฟเวอร์จำลองโปรโตคอล RobinSR',
  'robinsr.desc': 'เซิร์ฟเวอร์จำลองโปรโตคอล KCP/HTTP สำหรับทดสอบไคลเอนต์และรันไทม์ไปป์ไลน์',
  'robinsr.pipeline_badge': 'ไปป์ไลน์สกีมาทำงานอยู่',
  'robinsr.beta_title': 'ไปป์ไลน์นำเข้าข้อมูลไคลเอนต์เบต้า (Beta Client Ingestion Pipeline)',
  'robinsr.beta_desc': 'ระบุไดเรกทอรีการติดตั้งไคลเอนต์เพื่อถอดรหัส Metadata สกัดสกีมา Protobuf และอัปเดตตารางเส้นทางคำสั่ง (Opcode Router) อัตโนมัติ',
  'robinsr.beta_btn': 'ประมวลผลไคลเอนต์เบต้า',
  'robinsr.beta_ingesting': 'กำลังประมวลผลไบนารีและอัปเดตตารางเราเตอร์...',
  'robinsr.beta_synced': 'การซิงโครไนซ์ไปป์ไลน์เสร็จสมบูรณ์',
  'robinsr.step1': '01. วิเคราะห์ไบนารี',
  'robinsr.step2': '02. ถอดรหัส Metadata',
  'robinsr.step3': '03. ซิงค์สกีมา Proto',
  'robinsr.step4': '04. คอมไพล์ตารางเราเตอร์',
  'robinsr.stat_players': 'เซสชันที่เชื่อมต่อ',
  'robinsr.stat_dispatch': 'พอร์ต HTTP Dispatch',
  'robinsr.stat_game': 'พอร์ตเกม KCP UDP',
  'robinsr.stat_tick': 'Tickrate / Latency',
  'robinsr.uptime_title': 'สถานะการทำงานของบริการ & Uptime Monitor',
  'robinsr.spawner_title': 'กำหนดค่าเอนทิตีตัวละคร (Avatar Provisioning)',
  'robinsr.spawner_desc': 'กำหนดระดับเลเวลและสถานะตัวละครในเซสชัน',
  'robinsr.gm_title': 'คอนโซลคำสั่งจัดการ (Administrative Interface)',
  'robinsr.gm_placeholder': 'ป้อนคำสั่ง (/avatar 1308 80 6, /give 1 50000, /scene 20311)...',
  'robinsr.jades_btn': '+100,000 Stellar Jades',
  'robinsr.heal_btn': 'ฟื้นฟูสถานะทีม',

  // Dumper
  'dumper.title': 'ไปป์ไลน์สกัดหน่วยความจำ IL2CPP (Memory Reflection Pipeline)',
  'dumper.desc': 'สกัดโครงสร้าง Type Definitions, เมธอด, และสกีมา Protobuf จากรันไทม์หน่วยความจำของไคลเอนต์โดยตรง',
  'dumper.run_full': 'เริ่มการสกัดข้อมูลทั้งหมด',
  'dumper.target_dir': 'ไดเรกทอรีปลายทาง:',
  'dumper.open_dumps': 'เปิดไดเรกทอรี Dumps',
  'dumper.output_stream': 'บันทึกการทำงานของ Dumper (Telemetry Stream)',

  // Morax
  'morax.title': 'Morax Metadata Cracker',
  'morax.desc': 'โปรแกรมถอดรหัส global-metadata.dat แบบออฟไลน์และสร้างชุดแอสเซมบลีจำลองสำหรับวิเคราะห์โครงสร้างคลาส',
  'morax.badge': 'เครื่องมือถอดรหัส Metadata',
  'morax.run_btn': 'เริ่มการถอดรหัส Morax',
  'morax.processing': 'กำลังถอดรหัส Metadata...',
  'morax.paths_title': 'ตำแหน่งไฟล์เป้าหมาย',
  'morax.types_stat': 'นิยามคลาส (Types)',
  'morax.methods_stat': 'เมธอดที่พบ (Methods)',
  'morax.fields_stat': 'ฟิลด์ทั้งหมด (Fields)',
  'morax.time_stat': 'เวลาประมวลผลแบบขนาน',
  'morax.outputs_title': 'ชุดแอสเซมบลีที่สร้างเสร็จสมบูรณ์',

  // Sniffer
  'sniffer.title': 'Packet Sniffer & ตัวดักจับเครือข่าย',
  'sniffer.desc': 'ดักจับการรับส่งข้อมูลแพ็กเก็ต UDP/KCP แบบเรียลไทม์ พร้อมถอดรหัส XOR แสดงเป็น JSON โครงสร้าง',
  'sniffer.start': 'เริ่มการดักจับแพ็กเก็ต',
  'sniffer.stop': 'หยุดการดักจับ',
  'sniffer.clear': 'ล้างประวัติ',
  'sniffer.filter_placeholder': 'กรองด้วย CmdId หรือชื่อแพ็กเก็ต (PlayerLogin, SceneInfo)...',
  'sniffer.replay': 'ส่งแพ็กเก็ตซ้ำเข้าเครือข่ายไคลเอนต์ (Replay)',

  // Cheat & Tweaks
  'cheat.title': 'การปรับแต่งพารามิเตอร์รันไทม์ (Engine Tweaks)',
  'cheat.desc': 'กำหนดค่าการแสดงผล การเรนเดอร์ และปลดล็อคข้อจำกัดอัตราเฟรมผ่านการ Hook เธรดหน่วยความจำ',
  'cheat.hooks_active': 'เธรด Hook ทำงานอยู่',
  'cheat.safe_badge': 'APC Safe Thread Interception',

  // Lua
  'lua.title': 'คอนโซลสคริปต์ Monaco XLua',
  'lua.desc': 'ประมวลผลและทดสอบสคริปต์ XLua บนเธรดหลักของเอนจินเกมแบบเรียลไทม์',
  'lua.run_btn': 'ประมวลผลสคริปต์',
  'lua.scene_load': 'ประมวลผลอัตโนมัติเมื่อโหลดฉาก',
  'lua.presets': 'สคริปต์พรีเซ็ต',

  // Unpacker
  'unpacker.title': 'Asset Studio & Package Extractor',
  'unpacker.desc': 'สกัดชุดข้อมูล AssetBundle คลายการบีบอัด Oodle ถอดรหัสพื้นผิว ASTC/BC7 และแปลงโมเดลเป็น glTF',
  'unpacker.select_asb': 'เลือกไดเรกทอรี Asb',
  'unpacker.export_selected': 'ส่งออกไฟล์ที่เลือก',
  'unpacker.export_disk': 'ส่งออกไฟล์ลงดิสก์',
  'unpacker.search': 'ค้นหาไฟล์ Asset (Kafka, Mesh, BGM, TextMap)...',

  // Design
  'design.title': 'Visual Logic & Quest Flow Editor',
  'design.desc': 'เครื่องมือแก้ไขกราฟโหนดเชิงภาพสำหรับโครงสร้างบทสนทนา ลำดับเควส และคอมไพล์แพตช์ไบนารี .bytes',
  'design.graph_tab': 'ผืนผ้าใบ Node Graph',
  'design.json_tab': 'โครงสร้าง JSON Schema',
  'design.add_node': 'เพิ่ม Node',
  'design.save_patch': 'บันทึกแพตช์ .bytes',

  // Gacha
  'gacha.title': 'การวิเคราะห์ประวัติการสุ่ม & Pity Metrics',
  'gacha.desc': 'แยกและวิเคราะห์ข้อมูลประวัติการสุ่มจากแคชไคลเอนต์ พร้อมคำนวณรอบการันตี (Pity) และอัตราการแจกแจงทางสถิติ',
  'gacha.fetch_btn': 'ดึงประวัติการสุ่ม',
  'gacha.fetching': 'กำลังอ่านแคชไคลเอนต์...',
  'gacha.cached': 'พบ AuthKey ในแคชระบบ',
  'gacha.current_pity': 'Pity ตัวละครปัจจุบัน',
  'gacha.avg_pity': 'ค่าเฉลี่ย 5 ดาว (Pulls)',
  'gacha.win_rate': 'อัตราการชนะ 50 / 50',
  'gacha.total_jades': 'รวม Stellar Jades ที่ใช้',

  // UID
  'uid.title': 'การตรวจสอบโปรไฟล์ผู้เล่นและคะแนนวัตถุโบราณ',
  'uid.desc': 'ตรวจสอบสถิติอุปกรณ์และคำนวณคะแนนประสิทธิภาพ Crit Value (CV) จากข้อมูลโปรไฟล์สาธารณะ',
  'uid.fetch': 'ดึงข้อมูลโปรไฟล์',
  'uid.placeholder': 'ระบุ Star Rail UID...',

  // Config
  'config.title': 'การกำหนดค่าระบบ & AI Agent (MCP)',
  'config.desc': 'จัดการการเชื่อมต่อ Model Context Protocol (MCP), พอร์ต IPC, และโมเดลประมวลผล',
  'config.ai_title': 'AI ผู้ช่วยวิเคราะห์ทางเทคนิค (RE Assistant)',
  'config.active_model': 'โมเดล AI ที่กำหนดใช้งาน',

  // Console
  'console.title': 'บันทึก Telemetry Stream แบบเรียลไทม์',
  'console.desc': 'สตรีมข้อความการทำงาน การตรวจจับหน่วยความจำ และเอาต์พุตของเซิร์ฟเวอร์แบบเรียลไทม์',
  'console.search': 'กรองบันทึกด้วยคำค้นหาหรือชื่อโมดูล...',

  // Settings
  'settings.title': 'การตั้งค่าระบบ & ค่ากำหนดสภาพแวดล้อม',
  'settings.desc': 'กำหนดภาษา ไดเรกทอรีจัดเก็บข้อมูล พอร์ตเครือข่าย และลักษณะการแสดงผล',
  'settings.language': 'ภาษาของอินเทอร์เฟซ (Language)',
  'settings.language.desc': 'กำหนดภาษาระหว่างภาษาไทย (TH) และภาษาอังกฤษ (EN)',
  'settings.network': 'เครือข่ายและพอร์ต (Network Ports)',
  'settings.network.desc': 'กำหนดพอร์ต IPC WebSocket, HTTP Dispatch Gateway, และ KCP Gameserver',
  'settings.paths': 'ไดเรกทอรีระบบไฟล์ (File Paths)',
  'settings.paths.desc': 'กำหนดพาธไดเรกทอรีตัวเกม และไดเรกทอรีบันทึกผลลัพธ์จาก Dumper',
  'settings.game_path': 'ตำแหน่งการติดตั้งตัวเกม Star Rail',
  'settings.dump_path': 'ตำแหน่งบันทึกผลลัพธ์ Dumps Output',
  'settings.behavior': 'พฤติกรรมการ Hook และการแสดงผล',
  'settings.auto_connect': 'เชื่อมต่อ Backend อัตโนมัติเมื่อเริ่มต้น',
  'settings.auto_connect.desc': 'เชื่อมต่อ IPC WebSocket ทันทีที่อินเทอร์เฟซพร้อมทำงาน',
  'settings.auto_attach': 'แนบกระบวนการอัตโนมัติเมื่อตรวจพบ StarRail.exe',
  'settings.auto_attach.desc': 'แนบโมดูล DLL เข้าสู่กระบวนการเกมทันทีที่โปรเซสเริ่มต้น',
  'settings.animations': 'เปิดใช้งานเอฟเฟกต์แอนิเมชัน',
  'settings.animations.desc': 'เปิดหรือปิดการเรนเดอร์เอฟเฟกต์การเคลื่อนไหวเพื่อประสิทธิภาพ',
  'settings.compact': 'แถบข้างแบบกะทัดรัด (Compact Sidebar)',
  'settings.compact.desc': 'แสดงเฉพาะไอคอนในแถบนำทางเพื่อขยายพื้นที่ทำงาน',
  'settings.saved': 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
};

const translations: Record<Language, TranslationMap> = { en, th };

export function getTranslation(lang: Language, key: string): string {
  return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
}
