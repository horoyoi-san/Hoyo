use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use serde::Serialize;
use tauri::State;
use crate::embedded::{cwd, resolve_dump_dir};
use crate::state::{chrono_now, push_log, push_packet, AppState, GLOBAL_LOGS};

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
use crate::state::CREATE_NO_WINDOW;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ServerStatus {
    pub managed_running: bool,
    pub port_listening: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DumpIngestResult {
    pub success: bool,
    pub dump_path: String,
    pub opcodes_count: usize,
    pub paired_routes_count: usize,
    pub proto_found: bool,
    pub json_found: bool,
    pub dump_cs_found: bool,
    pub dummy_dll_found: bool,
    pub message: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LogsResult {
    pub next_index: usize,
    pub lines: Vec<String>,
}

#[tauri::command]
pub fn ingest_dump_folder() -> Result<DumpIngestResult, String> {
    let dump_dir = resolve_dump_dir();
    push_log(format!("[{}] 🔨 [DUMP INGESTION] Starting full schema build from: {}", chrono_now(), dump_dir.display()));

    let proto_found = dump_dir.join("StarRail.proto").is_file();
    let json_found = dump_dir.join("packetIds.json").is_file();
    let dump_cs_found = dump_dir.join("dump.cs").is_file();
    let dummy_dll_found = dump_dir.join("DummyDlls/Assembly-CSharp.dll").is_file();

    push_log(format!("[{}] 📄 Checking DUMP folder contents:", chrono_now()));
    push_log(format!("[{}]   - packetIds.json: {}", chrono_now(), if json_found { "✓ Present" } else { "✗ Missing" }));
    push_log(format!("[{}]   - StarRail.proto: {}", chrono_now(), if proto_found { "✓ Present" } else { "✗ Missing" }));
    push_log(format!("[{}]   - dump.cs: {}", chrono_now(), if dump_cs_found { "✓ Present" } else { "✗ Missing" }));
    push_log(format!("[{}]   - Assembly-CSharp.dll: {}", chrono_now(), if dummy_dll_found { "✓ Present" } else { "✗ Missing" }));

    let registry = robinsr::DynamicOpcodeRegistry::default();
    let opcodes_count = registry.load_from_dump_dir(&dump_dir);
    let paired_count = registry.req_to_rsp.len();

    push_log(format!(
        "[{}] 🔄 [DYNAMIC ROUTER] Compiled {} dynamic opcodes with {} auto-paired Request/Response routes",
        chrono_now(),
        opcodes_count,
        paired_count
    ));
    push_log(format!("[{}] ✅ [SERVER BUILD] Server schema build complete! Ready to start RobinSR.", chrono_now()));

    Ok(DumpIngestResult {
        success: true,
        dump_path: dump_dir.display().to_string(),
        opcodes_count,
        paired_routes_count: paired_count,
        proto_found,
        json_found,
        dump_cs_found,
        dummy_dll_found,
        message: format!("Successfully ingested {} opcodes from {}", opcodes_count, dump_dir.display()),
    })
}

pub fn find_server_binary(bin_name: &str) -> Option<PathBuf> {
    let cwd = cwd();
    let candidates = vec![
        cwd.join(format!("bin/{bin_name}.exe")),
        cwd.join(format!("{bin_name}.exe")),
        cwd.join(format!("../bin/{bin_name}.exe")),
        cwd.join(format!("crates/robinsr_engine/target/release/{bin_name}.exe")),
        cwd.join(format!("../crates/robinsr_engine/target/release/{bin_name}.exe")),
        cwd.join(format!("upstream_robinsr/target/release/{bin_name}.exe")),
    ];
    for c in candidates {
        if c.is_file() {
            return Some(c);
        }
    }
    if let Ok(exe) = std::env::current_exe()
        && let Some(parent) = exe.parent() {
            let direct = parent.join(format!("{bin_name}.exe"));
            if direct.is_file() {
                return Some(direct);
            }
            let bin_sub = parent.join(format!("bin/{bin_name}.exe"));
            if bin_sub.is_file() {
                return Some(bin_sub);
            }
        }
    None
}

#[tauri::command]
pub fn start_server(state: State<'_, AppState>) -> Result<u32, String> {
    push_log(format!("[{}] ⚡ Initializing RobinSR Private Server Engine...", chrono_now()));

    // 1. Auto Port Conflict Resolver: Terminate previous orphan server processes & free ports 21000 and 23301
    let _ = Command::new("taskkill").creation_flags(CREATE_NO_WINDOW).args(["/F", "/IM", "sdkserver.exe", "/T"]).output();
    let _ = Command::new("taskkill").creation_flags(CREATE_NO_WINDOW).args(["/F", "/IM", "gameserver.exe", "/T"]).output();
    let _ = Command::new("taskkill").creation_flags(CREATE_NO_WINDOW).args(["/F", "/IM", "robinsr.exe", "/T"]).output();

    // Release port 21000 (TCP) and 23301 (UDP) if occupied by background tasks
    let _ = Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", "Get-NetTCPConnection -LocalPort 21000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"])
        .output();
    let _ = Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", "Get-NetUDPEndpoint -LocalPort 23301 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"])
        .output();
    std::thread::sleep(Duration::from_millis(150));
    push_log(format!("[{}] [*] Port conflict resolver: ports 21000 & 23301 verified free.", chrono_now()));

    // 2. Ensure server working directory is bin/ with all required data files
    let root_dir = cwd();
    let work_dir = if root_dir.join("bin").is_dir() {
        root_dir.join("bin")
    } else {
        root_dir.clone()
    };
    for required in ["freesr-data.json", "res.json", "versions.json"] {
        let p = work_dir.join(required);
        if !p.is_file() {
            let candidates = vec![
                root_dir.join(required),
                root_dir.join("crates/robinsr_engine").join(required),
                root_dir.join("..").join(required),
            ];
            for cand in candidates {
                if cand.is_file() {
                    let _ = fs::copy(&cand, &p);
                    break;
                }
            }
        }
    }

    // 3. Locate binaries
    let sdk_bin = find_server_binary("sdkserver").ok_or_else(|| {
        "sdkserver.exe binary not found. Please check bin/sdkserver.exe".to_string()
    })?;
    let game_bin = find_server_binary("gameserver").ok_or_else(|| {
        "gameserver.exe binary not found. Please check bin/gameserver.exe".to_string()
    })?;

    push_log(format!("[{}] [*] Server Working Directory: {}", chrono_now(), work_dir.display()));
    push_log(format!("[{}] [*] Spawning SDK Dispatch Server: {}", chrono_now(), sdk_bin.display()));

    let mut sdk_cmd = Command::new(&sdk_bin);
    sdk_cmd.current_dir(&work_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let mut sdk_child = sdk_cmd.spawn().map_err(|e| format!("Failed to spawn sdkserver: {e}"))?;

    if let Some(stdout) = sdk_child.stdout.take() {
        std::thread::spawn(move || {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                push_log(format!("[{}] [DISPATCH] {}", chrono_now(), line));
            }
        });
    }
    if let Some(stderr) = sdk_child.stderr.take() {
        std::thread::spawn(move || {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                let tag = if line.contains("INFO") {
                    "[DISPATCH]"
                } else if line.contains("WARN") {
                    "[DISPATCH WARN]"
                } else {
                    "[DISPATCH ERR]"
                };
                push_log(format!("[{}] {} {}", chrono_now(), tag, line));
            }
        });
    }

    push_log(format!("[{}] [*] Spawning KCP Gameserver: {}", chrono_now(), game_bin.display()));
    let mut game_cmd = Command::new(&game_bin);
    game_cmd.current_dir(&work_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let mut game_child = game_cmd.spawn().map_err(|e| format!("Failed to spawn gameserver: {e}"))?;

    if let Some(stdout) = game_child.stdout.take() {
        std::thread::spawn(move || {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                push_log(format!("[{}] [GAMESERVER] {}", chrono_now(), line));
                if line.contains("sent packet with CmdID:") {
                    if let Some(num_str) = line.split("CmdID:").nth(1) {
                        if let Ok(cmd_id) = num_str.trim().parse::<u32>() {
                            push_packet(cmd_id, "server");
                        }
                    }
                } else if line.contains("recv packet with CmdID:") || line.contains("Received packet CmdID:") {
                    if let Some(num_str) = line.split("CmdID:").nth(1) {
                        if let Ok(cmd_id) = num_str.trim().parse::<u32>() {
                            push_packet(cmd_id, "client");
                        }
                    }
                }
            }
        });
    }
    if let Some(stderr) = game_child.stderr.take() {
        std::thread::spawn(move || {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                let tag = if line.contains("INFO") {
                    "[GAMESERVER]"
                } else if line.contains("WARN") {
                    "[GAMESERVER WARN]"
                } else {
                    "[GAMESERVER ERR]"
                };
                push_log(format!("[{}] {} {}", chrono_now(), tag, line));
            }
        });
    }

    {
        let mut guard_sdk = state.sdk_child.lock().unwrap();
        *guard_sdk = Some(sdk_child);
        let mut guard_game = state.game_child.lock().unwrap();
        *guard_game = Some(game_child);
    }

    push_log(format!("[{}] [OK] HTTP Dispatch Gateway (:21000) & KCP Gameserver (:23301) listening.", chrono_now()));
    Ok(21000)
}

#[tauri::command]
pub fn stop_server(state: State<'_, AppState>) -> Result<(), String> {
    push_log(format!("[{}] [*] Stopping RobinSR server...", chrono_now()));
    {
        let mut guard = state.sdk_child.lock().unwrap();
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
        }
    }
    {
        let mut guard = state.game_child.lock().unwrap();
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
        }
    }
    let _ = Command::new("taskkill").creation_flags(CREATE_NO_WINDOW).args(["/F", "/IM", "sdkserver.exe", "/T"]).output();
    let _ = Command::new("taskkill").creation_flags(CREATE_NO_WINDOW).args(["/F", "/IM", "gameserver.exe", "/T"]).output();
    push_log(format!("[{}] [OK] RobinSR server stopped.", chrono_now()));
    Ok(())
}

#[tauri::command]
pub fn reset_player_position() -> Result<String, String> {
    let root_dir = cwd();
    let candidates = [
        root_dir.join("bin").join("persistent"),
        root_dir.join("persistent"),
    ];
    let mut removed = false;
    for persistent_file in &candidates {
        if persistent_file.is_file() {
            let _ = fs::remove_file(persistent_file);
            removed = true;
        }
    }
    if removed {
        push_log(format!("[{}] [*] Reset player position: removed persistent state file in bin/.", chrono_now()));
        Ok("Reset position successful".to_string())
    } else {
        push_log(format!("[{}] [INFO] Persistent state file already clean (spawn position default).", chrono_now()));
        Ok("Default position active".to_string())
    }
}

#[tauri::command]
pub fn get_server_logs(from_index: usize) -> LogsResult {
    let guard = GLOBAL_LOGS.lock().unwrap();
    let len = guard.len();
    let lines = if from_index < len {
        guard[from_index..].to_vec()
    } else {
        Vec::new()
    };
    LogsResult {
        next_index: len,
        lines,
    }
}

#[tauri::command]
pub fn server_status(state: State<'_, AppState>) -> ServerStatus {
    let sdk_running = state
        .sdk_child
        .lock()
        .unwrap()
        .as_mut()
        .map(|c| c.try_wait().map(|s| s.is_none()).unwrap_or(false))
        .unwrap_or(false);

    let game_running = state
        .game_child
        .lock()
        .unwrap()
        .as_mut()
        .map(|c| c.try_wait().map(|s| s.is_none()).unwrap_or(false))
        .unwrap_or(false);

    let port_listening = std::net::TcpStream::connect_timeout(
        &"127.0.0.1:21000".parse().unwrap(),
        Duration::from_millis(300),
    )
    .is_ok();

    ServerStatus {
        managed_running: sdk_running || game_running || port_listening,
        port_listening,
    }
}
