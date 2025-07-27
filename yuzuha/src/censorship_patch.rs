use std::sync::atomic::{AtomicU32, Ordering};

use yuzuha_codegen::use_offsets;

use crate::interceptor::Interceptor;

static LAST_ENTER_SCENE_TYPE: AtomicU32 = AtomicU32::new(0);

#[use_offsets(
    SET_DITHER_CONFIG,
    DITHER_CONFIG_USING_DITHER_ALPHA,
    ON_ENTER_SCENE_SC_NOTIFY,
    SCENE_DATA_FIELD,
    SCENE_TYPE_FIELD
)]
pub fn init(interceptor: &mut Interceptor) {
    interceptor.attach(SET_DITHER_CONFIG, |ctx| {
        if LAST_ENTER_SCENE_TYPE.load(Ordering::SeqCst) == 1 {
            let dither_config = ctx.registers().rdx as usize;
            if dither_config != 0 {
                unsafe {
                    *((dither_config + DITHER_CONFIG_USING_DITHER_ALPHA) as *mut u8) = 0;
                }
            }
        }
    });

    interceptor.attach(ON_ENTER_SCENE_SC_NOTIFY, |ctx| {
        let notify = ctx.registers().rdx as usize;
        let scene_data = unsafe { *((notify + SCENE_DATA_FIELD) as *const usize) };
        let scene_type = unsafe { *((scene_data + SCENE_TYPE_FIELD) as *const u32) };

        LAST_ENTER_SCENE_TYPE.store(scene_type, Ordering::SeqCst);
    })
}
