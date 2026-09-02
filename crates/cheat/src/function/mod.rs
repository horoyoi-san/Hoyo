pub mod battle_speed;
pub mod censorship;
pub mod fov;
pub mod fps_unlock;
pub mod hide_ui;
pub mod keybind;

use std::{
    ffi::CString,
    sync::atomic::{AtomicUsize, Ordering},
};

use il2cpp::{
    api, get_cached_class,
    vm::{field::Il2CppField, object::Il2CppObject},
};
use reflection::runtime_type::RuntimeType;

type InputGetKeyDown = unsafe extern "win64" fn(i32) -> bool;

static GET_KEY_DOWN_VA: AtomicUsize = AtomicUsize::new(0);

pub fn on_frame_update() {
    keybind::tick();
    hide_ui::tick();
    fps_unlock::tick();
    battle_speed::tick();
    fov::tick();
}

pub(crate) fn get_key_down(key_code: i32) -> bool {
    let mut va = GET_KEY_DOWN_VA.load(Ordering::Relaxed);
    if va == 0 {
        let Some(found) = find_method_va("UnityEngine.Input", "GetKeyDown") else {
            return false;
        };
        GET_KEY_DOWN_VA.store(found, Ordering::Relaxed);
        va = found;
    }

    let get_key_down: InputGetKeyDown = unsafe { std::mem::transmute(va) };
    unsafe { get_key_down(key_code) }
}

pub fn find_method_va(class_name: &str, method_name: &str) -> Option<usize> {
    get_cached_class(class_name)
        .and_then(|class| RuntimeType::from_class(class).ok())
        .and_then(|ty| {
            ty.get_methods_il2cpp()
                .into_iter()
                .find(|method| {
                    method
                        .get_name()
                        .is_ok_and(|name| name.as_str() == method_name)
                })
                .map(|method| method.get_il2cpp_method().va())
        })
}

pub fn find_field(class_name: &str, field_name: &str) -> Option<Il2CppField> {
    let class = get_cached_class(class_name)?;
    let field_name = CString::new(field_name).ok()?;
    let field = api::il2cpp_class_get_field_from_name(class, field_name.as_ptr());
    (field.0 != 0).then_some(field)
}

pub fn get_field_object(field: Il2CppField, object: usize) -> Option<Il2CppObject> {
    let value = api::il2cpp_field_get_value_object(field, Il2CppObject(object));
    (value.0 != 0).then_some(value)
}
