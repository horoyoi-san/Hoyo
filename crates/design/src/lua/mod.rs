#![allow(dead_code, unused_imports)]

mod ast;
mod bytecode;
mod decode;
mod disasm;
mod emit;
mod lift;
mod lua_v;
mod opcodes;

use std::path::Path;

pub(crate) fn decompile_module_to_source(module: &bytecode::Module) -> String {
    let funcs = lift::decompile_module(module);
    let body = emit::Printer::new(&funcs).print_chunk(module.main_id as usize);
    body.to_string()
}

pub fn decompile_lua_archive(input_dir: &Path, out_dir: &Path) -> std::result::Result<(), String> {
    lua_v::run(input_dir, out_dir)
}
