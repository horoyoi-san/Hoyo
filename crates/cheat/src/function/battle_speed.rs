use std::sync::atomic::{AtomicBool, Ordering};
use super::find_method_va;

type TimeSetTimeScale = unsafe extern "win64" fn(f32);

static BATTLE_SPEED_ENABLED: AtomicBool = AtomicBool::new(false);

pub fn set_battle_speed_enabled(enabled: bool) {
    BATTLE_SPEED_ENABLED.store(enabled, Ordering::SeqCst);
    apply_speed(enabled);
}

pub fn tick() {
    if BATTLE_SPEED_ENABLED.load(Ordering::Relaxed) {
        apply_speed(true);
    }
}

fn apply_speed(enabled: bool) {
    if let Some(va) = find_method_va("UnityEngine.Time", "set_timeScale") {
        let set_time_scale: TimeSetTimeScale = unsafe { std::mem::transmute(va) };
        let scale = if enabled { 2.0 } else { 1.0 };
        unsafe { set_time_scale(scale) };
    }
}
