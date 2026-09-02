use std::sync::atomic::{AtomicBool, Ordering};
use super::find_method_va;

type CameraGetMain = unsafe extern "win64" fn() -> usize;
type CameraSetFov = unsafe extern "win64" fn(usize, f32);

static FOV_UNLOCK_ENABLED: AtomicBool = AtomicBool::new(false);

pub fn set_fov_unlock_enabled(enabled: bool) {
    FOV_UNLOCK_ENABLED.store(enabled, Ordering::SeqCst);
    apply_fov(enabled);
}

pub fn tick() {
    if FOV_UNLOCK_ENABLED.load(Ordering::Relaxed) {
        apply_fov(true);
    }
}

fn apply_fov(enabled: bool) {
    let Some(get_main_va) = find_method_va("UnityEngine.Camera", "get_main") else {
        return;
    };
    let Some(set_fov_va) = find_method_va("UnityEngine.Camera", "set_fieldOfView") else {
        return;
    };

    let get_main: CameraGetMain = unsafe { std::mem::transmute(get_main_va) };
    let set_fov: CameraSetFov = unsafe { std::mem::transmute(set_fov_va) };

    let cam_ptr = unsafe { get_main() };
    if cam_ptr != 0 {
        let fov = if enabled { 85.0 } else { 60.0 };
        unsafe { set_fov(cam_ptr, fov) };
    }
}
