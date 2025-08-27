use ilhook::x64::Registers;

use crate::addr::rva_config;

use super::{HkrpgModule, HkrpgModuleContext};

pub struct CensorshipPatch;

macro_rules! replace {
    ($self:ident, $config:ident, $($field:ident),*) => {
        $(
            if $config.$field != 0 {
                $self.interceptor.replace(
                    $config.$field,
                    CensorshipPatch::on_set_dither,
                )?;
            } else {
                println!("[censorship_patch::init] pattern is outdated! disabling dither patch for {}", stringify!($field));
            }
        )*
    };
}

impl HkrpgModule for HkrpgModuleContext<CensorshipPatch> {
    unsafe fn init(&mut self) -> Result<(), ilhook::HookError> {
        let config = rva_config();
        replace!(self, config, set_dither);
        Ok(())
    }
}

impl CensorshipPatch {
    pub unsafe extern "win64" fn on_set_dither(_: *mut Registers, _: usize, _: usize) -> usize {
        0
    }
}
