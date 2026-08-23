mod fmt;

use crate::lua::bytecode::Module;
use crate::lua::decode::decode;
pub use fmt::{fmt_number, quote_string, resolve_import, fmt_insn};

pub fn disasm_module(m: &Module) -> String {
    use std::fmt::Write;
    let mut out = String::new();
    let _ = writeln!(out, "-- xluau bytecode v{} (types v{}), {} protos, {} strings, main=proto {}",
        m.version, m.types_version, m.protos.len(), m.strings.len(), m.main_id);
    for i in 0..m.protos.len() {
        disasm_proto(m, i, &mut out);
        out.push('\n');
    }
    out
}

fn disasm_proto(m: &Module, idx: usize, out: &mut String) {
    use std::fmt::Write;
    let p = &m.protos[idx];
    let name = if p.debug_name != 0 { m.string_str(p.debug_name) } else { format!("proto_{idx}") };
    let _ = writeln!(out, "function {name}(params={}, vararg={}, upvals={}, stack={}) -- proto {idx}, line {}",
        p.num_params, p.is_vararg as u8, p.num_upvals, p.max_stack_size, p.line_defined);
    let (insns, _) = decode(&p.code);
    for ins in &insns {
        let line = p.line_at(ins.pc).map_or_else(|| "    .".into(), |l| format!("{l:>5}"));
        let _ = writeln!(out, "  {line}  [{:>4}] {}", ins.pc, fmt_insn(m, p, ins));
    }
    let _ = writeln!(out, "end");
}
