use crate::runtime;
use crate::script_v2::{scanner::Scanner, writer::Writer};

mod constants;
mod context;
mod models;
mod naming_utils;
mod scanner;
pub mod struct_init;
mod type_analyzer;
mod type_registry;
mod writer;

pub fn dump() {
    let handle = std::thread::Builder::new()
        .name("script-v2-dumper".into())
        .stack_size(32 * 1024 * 1024)
        .spawn(|| {
            runtime::attach_current_thread_to_il2cpp();
            let mut scanner = Scanner::default();
            scanner.init();

            let mut writer = Writer::new(scanner);
            writer.save_string_literals();
            writer.save_script();
            writer.save_struct();
        })
        .expect("failed to spawn dumper thread");

    if let Err(e) = handle.join() {
        log::error!("[Script Dumper] Thread error: {e:?}");
    }
}
