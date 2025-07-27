use yuzuha_codegen::use_offsets;

use crate::{BASE, interceptor::Interceptor};

#[use_offsets(COMBO_INIT_SUCCESS, SDK_STATICS, SDK_STATIC_ID, SDK_FIELD_OFFSET)]
pub fn disable_hoyopass(interceptor: &mut Interceptor) {
    interceptor.attach(COMBO_INIT_SUCCESS, |_| unsafe {
        let statics = *(BASE.get().unwrap().wrapping_add(SDK_STATICS) as *mut usize);
        let config_manager = *(statics.wrapping_add(SDK_STATIC_ID) as *mut usize);
        *(config_manager.wrapping_add(SDK_FIELD_OFFSET) as *mut bool) = false;
        println!("HoYoPassPatch - OnComboInitSuccess()");
    });
}
