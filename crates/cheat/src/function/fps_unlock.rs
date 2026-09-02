use std::sync::atomic::{AtomicBool, Ordering};
use super::find_method_va;

type ApplicationSetTargetFrameRate = unsafe extern "win64" fn(i32);

static FPS_UNLOCK_ENABLED: AtomicBool = AtomicBool::new(false);

pub fn set_fps_unlock_enabled(enabled: bool) {
    FPS_UNLOCK_ENABLED.store(enabled, Ordering::SeqCst);
    apply_fps(enabled);
}

pub fn tick() {
    if FPS_UNLOCK_ENABLED.load(Ordering::Relaxed) {
        apply_fps(true);
    }
}

fn apply_fps(enabled: bool) {
    if let Some(va) = find_method_va("UnityEngine.Application", "set_targetFrameRate") {
        let set_target_fps: ApplicationSetTargetFrameRate = unsafe { std::mem::transmute(va) };
        let fps = if enabled { 120 } else { 60 };
        unsafe { set_target_fps(fps) };
    }
}
