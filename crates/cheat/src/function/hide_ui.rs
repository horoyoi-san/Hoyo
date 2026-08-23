use std::sync::{
    OnceLock,
    atomic::{AtomicBool, AtomicU32, Ordering},
};

use il2cpp::vm::field::Il2CppField;

use super::{find_field, find_method_va};

type TimeGetUnscaledTime = unsafe extern "win64" fn() -> f32;
type CameraSetEnabled = unsafe extern "win64" fn(usize, bool);

const TIME: &str = "UnityEngine.Time";
const BEHAVIOUR: &str = "UnityEngine.Behaviour";
const GLOBAL_VARS: &str = "RPG.Client.GlobalVars";

const METHOD_GET_UNSCALED_TIME: &str = "get_unscaledTime";
const METHOD_SET_ENABLED: &str = "set_enabled";
const FIELD_S_UICAMERA: &str = "s_UICamera";

struct HideUiApi {
    get_unscaled_time: TimeGetUnscaledTime,
    set_enabled: CameraSetEnabled,
    s_uicamera: Il2CppField,
}

static HIDE_UI_ENABLED: AtomicBool = AtomicBool::new(false);
static LAST_UPDATE_TIME: AtomicU32 = AtomicU32::new(0);
static HIDE_UI_API: OnceLock<HideUiApi> = OnceLock::new();

pub fn set_hide_ui_enabled(enabled: bool) {
    HIDE_UI_ENABLED.store(enabled, Ordering::SeqCst);
}

pub fn tick() {
    let Some(api) = HideUiApi::get() else {
        return;
    };

    let current_time = unsafe { (api.get_unscaled_time)() };
    let last_time = f32::from_bits(LAST_UPDATE_TIME.load(Ordering::SeqCst));

    if current_time - last_time >= 0.1 {
        let camera_ptr = super::get_field_object(api.s_uicamera, 0)
            .map_or(0, |obj| obj.0);

        if camera_ptr != 0 {
            let should_hide = HIDE_UI_ENABLED.load(Ordering::SeqCst);
            unsafe {
                (api.set_enabled)(camera_ptr, !should_hide);
            }
        }

        LAST_UPDATE_TIME.store(current_time.to_bits(), Ordering::SeqCst);
    }
}

impl HideUiApi {
    fn get() -> Option<&'static Self> {
        if HIDE_UI_API.get().is_none()
            && let Some(api) = Self::resolve()
        {
            let _ = HIDE_UI_API.set(api);
        }
        HIDE_UI_API.get()
    }

    fn resolve() -> Option<Self> {
        Some(Self {
            get_unscaled_time: cast_fn(find_method_va(TIME, METHOD_GET_UNSCALED_TIME)?),
            set_enabled: cast_fn(find_method_va(BEHAVIOUR, METHOD_SET_ENABLED)?),
            s_uicamera: find_field(GLOBAL_VARS, FIELD_S_UICAMERA)?,
        })
    }
}

fn cast_fn<T: Copy>(address: usize) -> T {
    unsafe { std::mem::transmute_copy(&address) }
}
