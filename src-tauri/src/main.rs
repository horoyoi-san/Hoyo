// AstralOS desktop shell and native backend.
// Clean, modularized architecture.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod embedded;
mod packet_db;
mod state;
mod commands;

use state::{chrono_now, push_log, AppState};

fn main() {
    embedded::ensure_embedded_assets_extracted();

    robinsr::set_log_sink(|msg| {
        push_log(format!("[{}] {}", chrono_now(), msg));
    });

    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            // Server
            commands::server::start_server,
            commands::server::stop_server,
            commands::server::server_status,
            commands::server::get_server_logs,
            commands::server::reset_player_position,
            commands::server::ingest_dump_folder,

            // Patch & Launcher
            commands::patch::check_patch,
            commands::patch::install_patch,
            commands::patch::launch_game,
            commands::patch::execute_apply_patch,
            commands::patch::rollback_hdiff_patch,
            commands::patch::auto_protect_hook_dll,
            commands::patch::patch_repo_url,

            // Morax & ResCompiler
            commands::morax::execute_morax_metadata_dump,
            commands::morax::execute_beta_proto_dump,
            commands::morax::execute_dummy_dlls_dump,
            commands::morax::execute_generate_res_json,
            commands::morax::execute_morax_all_in_one,
            commands::morax::execute_dump_starrail_data,

            // Asset Studio (Unpacker)
            commands::assets::execute_scan_game_assets,
            commands::assets::execute_unpack_assets,
            commands::assets::get_asset_image_preview,
            commands::assets::export_single_asset,
            commands::assets::show_item_in_folder,

            // Language Patcher
            commands::lang::get_game_languages,
            commands::lang::set_game_language,
            commands::lang::rollback_game_language,

            // Packet Sniffer
            commands::sniffer::get_sniffer_packets,
            commands::sniffer::clear_sniffer_packets,

            // File Dialogs & Explorer
            commands::fs::open_in_explorer,
            commands::fs::open_dump_folder,
            commands::fs::pick_directory_dialog,
            commands::fs::pick_file_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running AstralOS desktop application");
}
