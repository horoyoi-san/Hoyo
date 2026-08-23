use std::sync::atomic::{AtomicBool, Ordering};

use il2cpp::get_cached_class;
use reflection::runtime_type::RuntimeType;
use utils::Interceptor;

static CENSORSHIP_HOOKED: AtomicBool = AtomicBool::new(false);
static mut CENSORSHIP_INTERCEPTOR: Interceptor = Interceptor::new();

pub fn set_censorship_enabled(enabled: bool) {
    if enabled {
        attach_censorship();
    } else {
        detach_censorship();
    }
}

fn attach_censorship() {
    if CENSORSHIP_HOOKED.swap(true, Ordering::SeqCst) {
        return;
    }

    let Some(method_va) = find_censorship_method_va() else {
        log::error!("[Cheat] Censorship patch: target method not found!");
        CENSORSHIP_HOOKED.store(false, Ordering::SeqCst);
        return;
    };

    unsafe {
        let interceptor = &raw mut CENSORSHIP_INTERCEPTOR;
        (*interceptor).replace(method_va, on_set_dither);
    }
}

fn detach_censorship() {
    if !CENSORSHIP_HOOKED.swap(false, Ordering::SeqCst) {
        return;
    }

    unsafe {
        let interceptor = &raw mut CENSORSHIP_INTERCEPTOR;
        (*interceptor).detach();
    }
}

fn find_censorship_method_va() -> Option<usize> {
    get_cached_class("RPG.Client.BaseShaderPropertyTransition")
        .and_then(|class| RuntimeType::from_class(class).ok())
        .and_then(|ty| {
            ty.get_methods_il2cpp()
                .into_iter()
                .find(|method| {
                    let params = method.get_parameters();
                    params.len() == 3
                        && method
                            .get_return_type()
                            .is_ok_and(|ty| ty.il_name() == "System.Boolean")
                        && params[0]
                            .get_parameter_type()
                            .is_ok_and(|ty| ty.il_name() == "System.Single")
                })
                .map(|method| method.get_il2cpp_method().va())
        })
}

unsafe extern "win64" fn on_set_dither(
    _: *mut ilhook::x64::Registers,
    _: usize,
    _: usize,
) -> usize {
    0
}
