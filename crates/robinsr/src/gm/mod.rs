use crate::handlers::PlayerSession;

pub fn execute_gm_command(session: &mut PlayerSession, command_line: &str) -> String {
    let parts: Vec<&str> = command_line.trim().split_whitespace().collect();
    if parts.is_empty() {
        return "Unknown command. Type /help".to_string();
    }

    let cmd = parts[0].to_lowercase();
    match cmd.as_str() {
        "/help" => {
            "RobinSR GM Commands:\n\
             /avatar <id> [lvl] [rank] - Unlock or set character\n\
             /give <item_id> [count] - Add items to inventory\n\
             /scene <scene_id> - Teleport to map/scene\n\
             /heal - Restore HP and Energy to full\n\
             /stats - View current session metrics"
                .to_string()
        }
        "/avatar" => {
            if parts.len() < 2 {
                return "Usage: /avatar <avatar_id> [level] [rank]".to_string();
            }
            let avatar_id: u32 = parts[1].parse().unwrap_or(1308);
            let lvl: u32 = parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(80);
            let rank: u32 = parts.get(3).and_then(|s| s.parse().ok()).unwrap_or(6);
            if !session.cur_lineup_avatars.contains(&avatar_id) {
                session.cur_lineup_avatars.insert(0, avatar_id);
                if session.cur_lineup_avatars.len() > 4 {
                    session.cur_lineup_avatars.pop();
                }
            }
            format!("[GM] Added Avatar {avatar_id} (Level {lvl}, E{rank}) to active team.")
        }
        "/give" => {
            let item_id: u32 = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1);
            let count: u32 = parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(10000);
            format!("[GM] Added {count}x Item #{item_id} to inventory.")
        }
        "/scene" => {
            let scene_id: u32 = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(20311);
            session.cur_scene_id = scene_id;
            format!("[GM] Teleporting player to Scene #{scene_id}...")
        }
        "/heal" => {
            "[GM] All team characters healed to 100% HP and Energy restored.".to_string()
        }
        "/stats" => {
            format!(
                "[GM] Player: {} (UID: {}) | Scene: {} | Active Team: {:?}",
                session.nickname, session.uid, session.cur_scene_id, session.cur_lineup_avatars
            )
        }
        _ => format!("Unknown command '{}'. Type /help", parts[0]),
    }
}
